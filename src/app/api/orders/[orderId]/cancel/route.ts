import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Product from '@/models/Product';
import Shipment from '@/models/Shipment';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { delhiveryService } from '@/lib/shipping/delhivery';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;

    // 1. Validate session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { reason } = body;

    // 3. Connect to database
    await connectDB();

    // 4. Get user from database
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 5. Fetch order
    const order = await Order.findById(orderId)
      .populate('shippingAddressId')
      .populate('userId');

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 6. Verify order ownership
    if (order.userId._id.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Unauthorized. This order does not belong to you.' },
        { status: 403 }
      );
    }

    // 7. Check if order can be cancelled
    const cancellableStatuses = ['pending', 'confirmed', 'processing'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return NextResponse.json(
        {
          error: `Order cannot be cancelled. Current status: ${order.orderStatus}`,
        },
        { status: 400 }
      );
    }

    // 8. Cancel Delhivery shipment if exists
    const shipment = await Shipment.findOne({ orderId: order._id });
    if (shipment) {
      const cancelResult = await delhiveryService.cancelShipment(shipment.waybill);

      if (!cancelResult.success) {
        console.error('Failed to cancel Delhivery shipment:', cancelResult.error);
        // Continue with order cancellation even if shipment cancellation fails
      }
    }

    // 9. Restore product stock (only if stock was actually deducted — not for pending/unpaid orders)
    const stockWasDeducted = ['confirmed', 'processing', 'shipped'].includes(order.orderStatus);
    if (stockWasDeducted) {
      const orderItems = await OrderItem.find({ orderId: order._id });

      for (const item of orderItems) {
        if (item.variantId) {
          // Restore variant-level and root stock
          await Product.findOneAndUpdate(
            { _id: item.productId, 'variants.id': item.variantId },
            { $inc: { 'variants.$.stock': item.quantity, stock: item.quantity } }
          );
        } else {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: item.quantity } }
          );
        }
        console.log(`Stock restored for product ${item.productName}: +${item.quantity} units`);
      }
    }

    // 10. Update order status
    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.lastStatusUpdate = new Date();

    if (reason) {
      order.refundReason = reason;
      order.cancelReason = reason;
    }

    // Handle refund if payment was successful
    const hadPaidPayment = order.paymentStatus === 'paid';
    if (hadPaidPayment) {
      order.paymentStatus = 'refunded';
      order.refundAmount = order.totalAmount;
      order.refundedAt = new Date();

      // Create refund transaction record
      await Transaction.create({
        orderId: order._id,
        gatewayOrderId: `REFUND-${order.orderNumber}`,
        amount: order.totalAmount,
        status: 'refunded',
        retryCount: 0,
        gatewayResponse: {
          type: 'refund',
          reason: reason || 'Order cancelled by customer',
          refundedAt: new Date(),
        },
      });

      // Update original transaction
      await Transaction.findOneAndUpdate(
        { orderId: order._id, status: 'success' },
        {
          $set: {
            gatewayResponse: {
              refund: {
                status: 'initiated',
                amount: order.totalAmount,
                reason: reason || 'Order cancelled by customer',
                initiatedAt: new Date(),
              },
            },
          },
        }
      );
    }

    await order.save();

    // 11. Send cancellation notifications (non-blocking)
    try {
      const populatedOrder = await Order.findById(order._id)
        .populate('shippingAddressId')
        .populate('userId');

      const customerName = (populatedOrder.userId as any)?.name || 'Customer';
      const customerEmail = (populatedOrder.userId as any)?.email || '';

      emailService.sendOrderCancelled(populatedOrder).catch((error) => {
        console.error('Error sending cancellation email:', error);
      });

      const phone = (populatedOrder.shippingAddressId as any)?.phoneNumber;
      if (phone) {
        smsService
          .sendOrderCancelledSMS(phone, order.orderNumber, order.refundAmount)
          .catch((error) => {
            console.error('Error sending cancellation SMS:', error);
          });
      }

      emailService.notifyAdminOrderCancelled({
        orderNumber: order.orderNumber,
        customerName,
        customerEmail,
        totalAmount: order.totalAmount,
        refundAmount: order.refundAmount,
      }).catch((error) => {
        console.error('Error sending admin cancellation email:', error);
      });
      smsService.notifyAdminOrderCancelled(order.orderNumber, customerName, order.refundAmount).catch((error) => {
        console.error('Error sending admin cancellation SMS:', error);
      });
    } catch (error) {
      console.error('Error sending cancellation notifications:', error);
    }

    // 12. Return success response
    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        cancelledAt: order.cancelledAt,
        refundAmount: order.refundAmount,
        refundStatus: hadPaidPayment ? 'initiated' : 'not_applicable',
      },
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel order',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
