import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Shipment from '@/models/Shipment';
import Order from '@/models/Order';
import User from '@/models/User';
import { getShippingProvider } from '@/lib/shipping/providerFactory';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';

// A dedicated secret so a leaked poll-cron trigger (passed as a URL query
// param — more exposure-prone than a header: server/proxy logs, cron
// dashboards, browser history) can't also be used to forge Delhivery webhook
// HMAC signatures. Falls back to the webhook secret only if the dedicated
// one hasn't been configured yet.
const POLL_SECRET = process.env.SHIPPING_POLL_SECRET || process.env.DELHIVERY_WEBHOOK_SECRET || '';

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
// Include both Delhivery (title-case) and Shiprocket (UPPER_CASE) terminal status strings
const TERMINAL_STATUSES = [
  'Delivered', 'RTO Delivered', 'Cancelled', 'Lost', 'Damaged',
  'DELIVERED', 'CANCELLED', 'LOST', 'DAMAGED', 'RTO DELIVERED',
];

/**
 * Poll tracking APIs for all active shipments (Delhivery + Shiprocket).
 * Auth: either admin session OR secret query param (for cron).
 *
 * GET /api/shipping/poll-tracking
 * GET /api/shipping/poll-tracking?secret=YOUR_SECRET  (for cron)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth: check secret param (cron) OR admin session
    const secret = request.nextUrl.searchParams.get('secret');
    const hasValidSecret = !!secret && !!POLL_SECRET && timingSafeStringEqual(secret, POLL_SECRET);

    if (!hasValidSecret) {
      // Check admin session
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      await connectDB();
      const user = await User.findOne({ email: session.user.email });
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    } else {
      await connectDB();
    }

    // Find all non-terminal shipments
    const activeShipments = await Shipment.find({
      shipmentStatus: { $nin: TERMINAL_STATUSES },
    }).limit(50);

    if (activeShipments.length === 0) {
      return NextResponse.json({ success: true, message: 'No active shipments to poll', updated: 0, total: 0 });
    }

    const results: Array<{ waybill: string; status: string; updated: boolean; error?: string }> = [];

    // Group shipments by provider so we can process each group in parallel
    const byProvider = new Map<string, typeof activeShipments>();
    for (const shipment of activeShipments) {
      const provider = (shipment as any).provider || 'delhivery';
      if (!byProvider.has(provider)) byProvider.set(provider, []);
      byProvider.get(provider)!.push(shipment);
    }

    // Process all providers concurrently; failures in one don't block the other
    const providerTasks = Array.from(byProvider.entries()).map(([provider, shipments]) =>
      (async () => {
        const shippingService = getShippingProvider(provider);

        await Promise.allSettled(
          shipments.map(async (shipment) => {
            try {
              const identifier = (shipment as any).providerShipmentId || shipment.waybill;
              const trackingData = await shippingService.trackShipment(identifier);

              if (!trackingData) {
                results.push({ waybill: shipment.waybill, status: shipment.shipmentStatus, updated: false, error: 'No tracking data' });
                return;
              }

              let updated = false;

              // Update shipment status
              if (trackingData.status && trackingData.status !== shipment.shipmentStatus) {
                shipment.shipmentStatus = trackingData.status;
                shipment.currentLocation = trackingData.currentLocation;
                updated = true;
              }

              // Add new scans (avoid duplicates)
              if (trackingData.scans && trackingData.scans.length > 0) {
                for (const scan of trackingData.scans) {
                  const existingScan = shipment.scans.find(
                    (s: any) =>
                      new Date(s.timestamp).getTime() === new Date(scan.timestamp).getTime() &&
                      s.status === scan.activity
                  );

                  if (!existingScan) {
                    shipment.scans.push({
                      status: scan.activity,
                      location: scan.location,
                      timestamp: new Date(scan.timestamp),
                      remarks: scan.status,
                    });
                    updated = true;
                  }
                }

                shipment.scans.sort(
                  (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
              }

              if (trackingData.mappedStatus === 'delivered' && !shipment.deliveryDate) {
                shipment.deliveryDate = new Date();
                updated = true;
              }

              if (updated) {
                await shipment.save();

                const order = await Order.findById(shipment.orderId)
                  .populate('shippingAddressId')
                  .populate('userId');

                if (order) {
                  const newOrderStatus = shippingService.mapStatus(trackingData.status);

                  if (order.orderStatus !== newOrderStatus) {
                    order.orderStatus = newOrderStatus as any;
                    order.lastStatusUpdate = new Date();

                    if (newOrderStatus === 'delivered') {
                      order.deliveredAt = new Date();
                    }

                    await order.save();

                    // Send notifications
                    try {
                      const customerName = (order.userId as any)?.name || 'Customer';
                      const customerEmail = (order.userId as any)?.email || '';
                      if (newOrderStatus === 'delivered') {
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
                      } else if (trackingData.mappedStatus === 'shipped' && trackingData.status.toUpperCase().includes('OUT FOR DELIVERY')) {
                        const phone = (order.shippingAddressId as any)?.phoneNumber;
                        if (phone) {
                          smsService.sendOutForDeliverySMS(phone, order.orderNumber).catch(console.error);
                        }
                        smsService.notifyAdminOutForDelivery(order.orderNumber, customerName).catch(console.error);
                      }
                    } catch (notifError) {
                      console.error('Error sending poll notification:', notifError);
                    }
                  }
                }
              }

              results.push({ waybill: shipment.waybill, status: trackingData.status, updated });
            } catch (err: any) {
              results.push({ waybill: shipment.waybill, status: shipment.shipmentStatus, updated: false, error: err.message });
            }
          })
        );
      })()
    );

    await Promise.allSettled(providerTasks);

    const updatedCount = results.filter((r) => r.updated).length;

    return NextResponse.json({
      success: true,
      total: activeShipments.length,
      updated: updatedCount,
      results,
    });
  } catch (error: any) {
    console.error('Error polling tracking:', error);
    return NextResponse.json(
      { error: 'Failed to poll tracking', message: error.message },
      { status: 500 }
    );
  }
}
