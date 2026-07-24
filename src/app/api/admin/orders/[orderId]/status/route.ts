import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Shipment from '@/models/Shipment';
import Transaction from '@/models/Transaction';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';
import { notifyOrderStatus } from '@/lib/notifications/fcm';
import { createLogger, LogMessages } from '@/lib/utils/logger';

/**
 * PATCH /api/admin/orders/[orderId]/status
 * Update order status (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const logger = createLogger({ component: 'AdminOrderStatus', endpoint: '/api/admin/orders/[orderId]/status' });

  const { orderId } = await params;

  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    // Connect to database
    await connectDB();
    const { status } = await request.json();

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Find and update order
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if payment is successful before updating to forward-progression statuses
    if (['confirmed', 'processing', 'shipped', 'delivered'].includes(status)) {
      if (!['paid', 'refunded'].includes(order.paymentStatus)) {
        return NextResponse.json(
          { error: 'Cannot update order status before successful payment' },
          { status: 400 }
        );
      }
    }

    // Update order status
    const previousStatus = order.orderStatus;
    order.orderStatus = status;
    order.lastStatusUpdate = new Date();

    // Handle refund when admin cancels a paid order
    if (status === 'cancelled' && order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
      order.refundAmount = order.totalAmount;
      order.refundedAt = new Date();

      await Transaction.create({
        orderId: order._id,
        gatewayOrderId: `REFUND-${order.orderNumber}`,
        amount: order.totalAmount,
        status: 'refunded',
        retryCount: 0,
        gatewayResponse: {
          type: 'refund',
          reason: 'Order cancelled by admin',
          refundedAt: new Date(),
        },
      });

      await Transaction.findOneAndUpdate(
        { orderId: order._id, status: 'success' },
        {
          $set: {
            gatewayResponse: {
              refund: {
                status: 'initiated',
                amount: order.totalAmount,
                reason: 'Order cancelled by admin',
                initiatedAt: new Date(),
              },
            },
          },
        }
      );
    }

    await order.save();

    logger.info('Order status updated', {
      orderId,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: status,
      adminId: adminCheck.session.user.id,
    });

    // Send customer notifications based on new status (non-blocking)
    Promise.resolve().then(async () => {
      try {
        const populatedOrder = await Order.findById(orderId)
          .populate('shippingAddressId')
          .populate('userId');
        if (!populatedOrder) return;

        // Mobile push (additive to email/SMS; deep-links to the order screen).
        if (['confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
          notifyOrderStatus(String(order.userId), order.orderNumber, String(order._id), status).catch((err) => {
            console.error('Admin status: error sending push notification:', err);
          });
        }

        const phone = (populatedOrder.shippingAddressId as any)?.phoneNumber;
        const customerName = (populatedOrder.userId as any)?.name || 'Customer';
        const customerEmail = (populatedOrder.userId as any)?.email || '';

        if (status === 'cancelled') {
          emailService.sendOrderCancelled(populatedOrder).catch((err) => {
            console.error('Admin status: error sending cancellation email:', err);
          });
          if (phone) {
            smsService.sendOrderCancelledSMS(phone, order.orderNumber, order.refundAmount || undefined).catch((err) => {
              console.error('Admin status: error sending cancellation SMS:', err);
            });
          }
          emailService.notifyAdminOrderCancelled({
            orderNumber: order.orderNumber,
            customerName,
            customerEmail,
            totalAmount: order.totalAmount,
            refundAmount: order.refundAmount,
          }).catch((err) => {
            console.error('Admin status: error sending admin cancellation email:', err);
          });
          smsService.notifyAdminOrderCancelled(order.orderNumber, customerName, order.refundAmount || undefined).catch((err) => {
            console.error('Admin status: error sending admin cancellation SMS:', err);
          });
        } else if (status === 'shipped') {
          const shipment = await Shipment.findOne({ orderId: order._id });
          emailService.sendShipmentCreated(populatedOrder, shipment).catch((err) => {
            console.error('Admin status: error sending shipment email:', err);
          });
          if (phone && shipment?.waybill) {
            smsService.sendShipmentSMS(phone, order.orderNumber, shipment.waybill).catch((err) => {
              console.error('Admin status: error sending shipment SMS:', err);
            });
          }
          emailService.notifyAdminShipmentCreated(
            { orderNumber: order.orderNumber, customerName, customerEmail },
            { waybill: shipment?.waybill, provider: shipment?.provider, trackingUrl: shipment?.trackingUrl }
          ).catch((err) => {
            console.error('Admin status: error sending admin shipment email:', err);
          });
          smsService.notifyAdminShipmentCreated(order.orderNumber, shipment?.waybill || '', customerName).catch((err) => {
            console.error('Admin status: error sending admin shipment SMS:', err);
          });
        } else if (status === 'delivered') {
          emailService.sendOrderDelivered(populatedOrder).catch((err) => {
            console.error('Admin status: error sending delivery email:', err);
          });
          emailService.sendDeliveryFeedbackRequest(populatedOrder).catch((err) => {
            console.error('Admin status: error sending feedback email:', err);
          });
          if (phone) {
            smsService.sendDeliverySMS(phone, order.orderNumber).catch((err) => {
              console.error('Admin status: error sending delivery SMS:', err);
            });
            const reviewUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ''}/orders`;
            smsService.sendFeedbackRequestSMS(phone, order.orderNumber, reviewUrl).catch((err) => {
              console.error('Admin status: error sending feedback SMS:', err);
            });
          }
          emailService.notifyAdminOrderDelivered({ orderNumber: order.orderNumber, customerName, customerEmail }).catch((err) => {
            console.error('Admin status: error sending admin delivery email:', err);
          });
          smsService.notifyAdminOrderDelivered(order.orderNumber, customerName).catch((err) => {
            console.error('Admin status: error sending admin delivery SMS:', err);
          });
        }
      } catch (err) {
        console.error('Admin status: error sending customer notifications:', err);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        refundAmount: order.refundAmount || 0,
        refundedAt: order.refundedAt?.toISOString() || null,
        cancelledAt: order.cancelledAt?.toISOString() || null,
        lastStatusUpdate: order.lastStatusUpdate,
      },
    });
  } catch (error: any) {
    logger.error('Failed to update order status', error, {
      orderId,
    });

    return NextResponse.json(
      { error: 'Failed to update order status', details: error.message },
      { status: 500 }
    );
  }
}
