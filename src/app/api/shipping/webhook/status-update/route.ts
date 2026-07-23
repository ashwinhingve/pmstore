import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Shipment from '@/models/Shipment';
import Order from '@/models/Order';
import { shiprocketService } from '@/lib/shipping/shiprocket';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';

/**
 * Shiprocket webhook handler.
 *
 * In Shiprocket Dashboard → Settings → Webhooks:
 *   URL:   https://yourdomain.com/api/shipping/webhook/status-update
 *   Token: (set any random string here AND set it as SHIPROCKET_WEBHOOK_SECRET env var)
 *
 * Shiprocket sends the token in the `x-api-key` request header.
 * Note: URL must NOT contain the words "shiprocket", "kartrocket", "sr", or "kr".
 */
export async function POST(request: NextRequest) {
  // Validate the x-api-key token Shiprocket sends
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
  if (secret) {
    const incomingKey = request.headers.get('x-api-key') || '';
    if (incomingKey !== secret) {
      console.warn('Shiprocket webhook: invalid x-api-key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let event: any;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Log payload on first deploys to validate field names
  console.log('Shiprocket webhook event:', JSON.stringify(event));

  const awb: string = event.awb || event.awb_code || '';
  const currentStatus: string = event.current_status || event.status || '';

  if (!awb) {
    return NextResponse.json({ received: true, skipped: 'no awb' });
  }

  try {
    await connectDB();

    const shipment = await Shipment.findOne({ waybill: awb });
    if (!shipment) {
      console.warn(`Shiprocket webhook: shipment not found for AWB ${awb}`);
      return NextResponse.json({ received: true, skipped: 'shipment not found' });
    }

    let updated = false;

    // Update status + location
    if (currentStatus && currentStatus !== shipment.shipmentStatus) {
      shipment.shipmentStatus = currentStatus;
      updated = true;
    }
    if (event.current_status_description) {
      shipment.currentLocation = event.current_status_description;
    }

    // Push new scan entry
    const scanTimestamp = event.date ? new Date(event.date) : new Date();
    const scanActivity: string = event.activity || currentStatus || '';
    const scanLocation: string = event.location || event.city || '';

    if (scanActivity) {
      const duplicate = shipment.scans.find(
        (s: any) =>
          new Date(s.timestamp).getTime() === scanTimestamp.getTime() &&
          s.status === scanActivity
      );

      if (!duplicate) {
        shipment.scans.push({
          status: scanActivity,
          location: scanLocation,
          timestamp: scanTimestamp,
          remarks: currentStatus,
        });

        shipment.scans.sort(
          (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        updated = true;
      }
    }

    // Mark delivery date
    const mappedStatus = shiprocketService.mapStatus(currentStatus);
    if (mappedStatus === 'delivered' && !shipment.deliveryDate) {
      shipment.deliveryDate = new Date();
      updated = true;
    }

    if (updated) {
      await shipment.save();
    }

    // Update order status
    const order = await Order.findById(shipment.orderId)
      .populate('shippingAddressId')
      .populate('userId');

    if (order && mappedStatus && order.orderStatus !== mappedStatus) {
      order.orderStatus = mappedStatus as any;
      order.lastStatusUpdate = new Date();
      if (mappedStatus === 'delivered') {
        order.deliveredAt = new Date();
      }
      await order.save();

      // Send customer notifications (non-blocking)
      try {
        const customerName = (order.userId as any)?.name || 'Customer';
        const customerEmail = (order.userId as any)?.email || '';
        if (mappedStatus === 'delivered') {
          emailService.sendOrderDelivered(order).catch(console.error);
          emailService.sendDeliveryFeedbackRequest(order).catch(console.error);
          const phone = (order.shippingAddressId as any)?.phoneNumber;
          if (phone) {
            smsService.sendDeliverySMS(phone, order.orderNumber).catch(console.error);
            const reviewUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ''}/orders`;
            smsService.sendFeedbackRequestSMS(phone, order.orderNumber, reviewUrl).catch(console.error);
          }
          emailService.notifyAdminOrderDelivered({ orderNumber: order.orderNumber, customerName, customerEmail }).catch(console.error);
          smsService.notifyAdminOrderDelivered(order.orderNumber, customerName).catch(console.error);
        } else if (currentStatus.toUpperCase().includes('OUT FOR DELIVERY')) {
          const phone = (order.shippingAddressId as any)?.phoneNumber;
          if (phone) {
            smsService.sendOutForDeliverySMS(phone, order.orderNumber).catch(console.error);
          }
          smsService.notifyAdminOutForDelivery(order.orderNumber, customerName).catch(console.error);
        }
      } catch (notifError) {
        console.error('Error sending webhook notification:', notifError);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Shiprocket webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    );
  }
}
