import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Product from '@/models/Product';
import Discount from '@/models/Discount';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';
import { whatsappService } from '@/lib/notifications/whatsapp';

/**
 * POST /api/payment/confirm-cod
 * Confirms a Cash on Delivery order. Sets paymentMethod to 'cod',
 * orderStatus to 'confirmed', reduces stock, and sends notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    await connectDB();

    const order = await Order.findOne({
      _id: orderId,
      userId: session.user.id,
      orderStatus: 'pending',
      paymentStatus: 'pending',
    }).populate('shippingAddressId');

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or already processed' },
        { status: 404 }
      );
    }

    // Update order for COD
    order.paymentMethod = 'cod';
    order.orderStatus = 'confirmed';
    order.paymentStatus = 'pending'; // paid on delivery
    order.lastStatusUpdate = new Date();
    await order.save();

    // Increment discount usage counter now that order is confirmed
    if (order.discountId) {
      await Discount.findByIdAndUpdate(order.discountId, { $inc: { totalUsed: 1 } });
    }

    // Reduce product stock (variant-aware)
    const orderItems = await OrderItem.find({ orderId: order._id });
    for (const item of orderItems) {
      if (item.variantId) {
        await Product.findOneAndUpdate(
          {
            _id: item.productId,
            variants: { $elemMatch: { id: item.variantId, stock: { $gte: item.quantity } } },
          },
          { $inc: { 'variants.$.stock': -item.quantity, stock: -item.quantity } }
        );
      } else {
        await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } }
        );
      }
    }

    // Send notifications (non-blocking)
    try {
      const populatedOrder = await Order.findById(order._id)
        .populate('shippingAddressId')
        .populate('userId');

      if (!populatedOrder) {
        console.error('COD: could not re-fetch populated order for notifications, orderId:', order._id);
      } else {
        // Customer notifications fire immediately
        emailService.sendOrderConfirmation(populatedOrder).catch((err) => {
          console.error('COD order email error:', err);
        });

        const phone = (populatedOrder.shippingAddressId as any)?.phoneNumber;
        if (phone) {
          smsService
            .sendOrderConfirmationSMS(phone, order.orderNumber, order.totalAmount)
            .catch((err) => {
              console.error('COD order SMS error:', err);
            });
        }

        // Admin notifications — use already-fetched orderItems (in scope above)
        const itemCount = orderItems.reduce((sum, i: any) => sum + i.quantity, 0);
        const customerName = (populatedOrder.userId as any)?.name || 'Customer';
        const customerEmail = (populatedOrder.userId as any)?.email || '';
        const shippingAddress = (populatedOrder.shippingAddressId as any) || {};

        whatsappService.notifyNewOrder({
          orderNumber: order.orderNumber,
          customerName,
          totalAmount: order.totalAmount,
          itemCount,
          paymentMethod: 'cod',
        }).catch((err) => {
          console.error('COD Telegram notification error:', err);
        });

        emailService.notifyAdminNewOrder({
          orderNumber: order.orderNumber,
          customerName,
          customerEmail,
          totalAmount: order.totalAmount,
          itemCount,
          paymentMethod: 'cod',
          shippingAddress,
        }).catch((err) => {
          console.error('COD admin email notification error:', err);
        });

        smsService.notifyAdminOrderConfirmed(order.orderNumber, customerName, order.totalAmount, 'cod').catch((err) => {
          console.error('COD admin order confirmed SMS error:', err);
        });
      }
    } catch (err) {
      console.error('Error sending COD notifications:', err);
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order._id,
    });
  } catch (error: any) {
    console.error('COD confirmation error:', error);
    return NextResponse.json({ error: 'Failed to confirm order' }, { status: 500 });
  }
}
