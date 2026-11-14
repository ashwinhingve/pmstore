import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { createErrorResponse } from '@/lib/utils/errorHandler';
import Order from '@/models/Order';
import { createShipmentForOrder } from '@/lib/shipping/createShipmentForOrder';
import { bookingRequestSchema } from '@/lib/shipping/admin-request';
import { estimateDelhivery } from '@/lib/shipping/estimate';

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAdminAccess();
    if (access.error) return access.error;
    const limited = await applyRateLimit(request, { windowMs: 60000, maxRequests: 10, keyPrefix: 'shipping-book' });
    if (limited) return limited;
    const parsed = bookingRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A valid order ID and courier are required.' }, { status: 400 });
    const { orderId, provider } = parsed.data;
    const order = await Order.findById(orderId).populate('shippingAddressId');
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const parcel = order.confirmedParcel;
    let estimate;
    if (parcel && provider === 'delhivery' && !order.trackingNumber && !order.shipmentBookingState) {
      try {
        estimate = await estimateDelhivery(parcel, order.shippingAddressId.postalCode, order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' ? 'cod' : 'prepaid', order.totalAmount, order.pickupLocation?.pincode);
      } catch { /* A missing quote never becomes a fabricated cost. */ }
    }
    const result = await createShipmentForOrder(orderId, provider, true, parcel ? { parcel, estimate } : undefined);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
