import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { createErrorResponse } from '@/lib/utils/errorHandler';
import Order from '@/models/Order';
import Shipment from '@/models/Shipment';
import { parcelRequestSchema } from '@/lib/shipping/admin-request';
import { estimateDelhivery } from '@/lib/shipping/estimate';

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAdminAccess();
    if (access.error) return access.error;
    const limited = await applyRateLimit(request, { windowMs: 60000, maxRequests: 20, keyPrefix: 'shipping-parcel' });
    if (limited) return limited;
    const parsed = parcelRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid order, packed weight in grams and all dimensions in centimetres.' }, { status: 400 });
    const { orderId, parcel, provider, action } = parsed.data;
    if (await Shipment.exists({ orderId })) return NextResponse.json({ error: 'This order already has a shipment. Correct its measurements in the courier dashboard; do not rebook.' }, { status: 409 });
    const confirmedParcel = { ...parcel, confirmedAt: new Date(), confirmedBy: String(access.session.user.id) };
    const order = await Order.findOneAndUpdate({
      _id: orderId,
      shipmentBookingState: { $nin: ['creating', 'uncertain', 'booked'] },
      trackingNumber: { $in: [null, ''] },
      orderStatus: { $nin: ['cancelled', 'refunded', 'shipped', 'delivered'] },
      $or: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod', paymentStatus: 'pending', orderStatus: 'confirmed' }],
    }, { $set: { confirmedParcel }, $unset: { courierEstimate: 1 } }, { new: true }).populate('shippingAddressId');
    if (!order) return NextResponse.json({ error: 'Order is not ready or a booking is already in progress. Refresh the order and check the courier dashboard.' }, { status: 409 });
    if (action === 'confirm') return NextResponse.json({ success: true, parcel: confirmedParcel });
    if (provider !== 'delhivery') return NextResponse.json({ success: true, parcel: confirmedParcel, estimate: null, message: 'Parcel saved. A Shiprocket cost estimate is unavailable here; check its dashboard.' });
    try {
      const estimate = await estimateDelhivery(parcel, order.shippingAddressId.postalCode, order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' ? 'cod' : 'prepaid', order.totalAmount, order.pickupLocation?.pincode);
      const updated = await Order.updateOne({
        _id: orderId, 'confirmedParcel.confirmedAt': confirmedParcel.confirmedAt,
        shipmentBookingState: { $nin: ['creating', 'uncertain', 'booked'] },
      }, { $set: { courierEstimate: estimate } });
      if (!updated.modifiedCount) return NextResponse.json({ error: 'Parcel changed while fetching the estimate. Refresh and estimate again.' }, { status: 409 });
      return NextResponse.json({ success: true, parcel: confirmedParcel, estimate });
    } catch {
      return NextResponse.json({ success: true, parcel: confirmedParcel, estimate: null, message: 'Parcel saved. Courier estimate unavailable; check Delhivery One before booking.' });
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
