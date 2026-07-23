import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import { cashfreeService } from '@/lib/payment/cashfree';
import { createShipmentForOrder } from '@/lib/shipping/createShipmentForOrder';

/**
 * POST /api/admin/sync/payments
 * Admin-triggered sync: polls Cashfree for the latest status of pending orders
 * and updates Order + Transaction records accordingly.
 */
export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  await connectDB();

  // Find orders in a non-terminal payment state, created in the last 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const pendingOrders = await Order.find({
    paymentStatus: 'pending',
    paymentMethod: { $ne: 'cod' },
    createdAt: { $gte: cutoff },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const results: Array<{
    orderNumber: string;
    previousStatus: string;
    newStatus: string;
    action: string;
    error?: string;
  }> = [];
  let updated = 0;

  for (const order of pendingOrders as any[]) {
    try {
      // Verify current status with Cashfree
      const verification = await cashfreeService.verifyPayment(order.orderNumber);

      if (verification.success) {
        // Payment was completed - we missed the webhook
        const orderDoc = await Order.findById(order._id);
        if (!orderDoc) continue;

        const paymentMethod = cashfreeService.getPaymentMethod(verification.paymentMethod || '');

        orderDoc.paymentStatus = 'paid';
        orderDoc.orderStatus = 'confirmed';
        orderDoc.paymentId = verification.transactionId;
        orderDoc.transactionId = verification.transactionId;
        orderDoc.paymentMethod = paymentMethod;
        orderDoc.lastStatusUpdate = new Date();
        await orderDoc.save();

        // Update the transaction record
        await Transaction.findOneAndUpdate(
          { orderId: order._id, status: { $nin: ['success', 'refunded'] } },
          {
            $set: {
              status: 'success',
              transactionId: verification.transactionId || '',
              paymentMethod,
              gatewayResponse: verification.gatewayResponse,
            },
          }
        );

        // Try to create shipment if not already done
        try {
          await createShipmentForOrder(order._id.toString());
        } catch {
          // Non-fatal: shipment creation might already exist
        }

        updated++;
        results.push({
          orderNumber: order.orderNumber,
          previousStatus: 'pending',
          newStatus: 'paid',
          action: 'marked_paid',
        });
      } else if (['CANCELLED', 'VOID', 'EXPIRED'].includes(verification.status)) {
        // Payment was cancelled or expired at Cashfree
        const orderDoc = await Order.findById(order._id);
        if (!orderDoc) continue;

        orderDoc.orderStatus = 'cancelled';
        orderDoc.cancelledAt = new Date();
        orderDoc.lastStatusUpdate = new Date();
        await orderDoc.save();

        await Transaction.findOneAndUpdate(
          { orderId: order._id, status: { $nin: ['success', 'refunded'] } },
          {
            $set: {
              status: 'failed',
              gatewayResponse: verification.gatewayResponse,
            },
          }
        );

        updated++;
        results.push({
          orderNumber: order.orderNumber,
          previousStatus: 'pending',
          newStatus: verification.status.toLowerCase(),
          action: 'marked_cancelled',
        });
      } else {
        // Still ACTIVE / pending at Cashfree — no change
        results.push({
          orderNumber: order.orderNumber,
          previousStatus: 'pending',
          newStatus: verification.status,
          action: 'no_change',
        });
      }
    } catch (err: any) {
      results.push({
        orderNumber: order.orderNumber,
        previousStatus: 'pending',
        newStatus: 'error',
        action: 'error',
        error: err.message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    total: pendingOrders.length,
    updated,
    results,
  });
}
