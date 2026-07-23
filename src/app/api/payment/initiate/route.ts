import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { cashfreeService } from '@/lib/payment/cashfree';
import { applyRateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 1. Apply rate limiting (10 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, RateLimitPresets.PAYMENT_INITIATE);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 2. Validate session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to continue.' },
        { status: 401 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // 4. Connect to database
    await connectDB();

    // 5. Get user from database
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 6. Fetch and validate order
    const order = await Order.findById(orderId).populate('shippingAddressId');

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 7. Verify order ownership
    if (order.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Unauthorized. This order does not belong to you.' },
        { status: 403 }
      );
    }

    // 8. Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'This order has already been paid' },
        { status: 400 }
      );
    }

    // 9. Check if there's an existing successful transaction
    const existingTransaction = await Transaction.findOne({
      orderId: order._id,
      status: 'success',
    });

    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Payment already completed for this order' },
        { status: 400 }
      );
    }

    // 10. Validate order amount
    if (order.totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid order amount' },
        { status: 400 }
      );
    }

    // 11. Check for existing initiated transaction
    let transaction = await Transaction.findOne({
      orderId: order._id,
      status: { $in: ['initiated', 'pending'] },
    });

    // 12. Create Cashfree order
    const shippingAddress = order.shippingAddressId as any;
    const cashfreeOrder = await cashfreeService.createOrder({
      orderId: order.orderNumber,
      orderAmount: order.totalAmount,
      customerName: user.name || session.user.name || 'Customer',
      customerEmail: user.email || session.user.email,
      customerPhone: shippingAddress?.phoneNumber || '9999999999',
    });

    // 13. Create or update transaction
    if (transaction) {
      transaction.paymentSessionId = cashfreeOrder.paymentSessionId;
      transaction.retryCount += 1;
      await transaction.save();
    } else {
      transaction = await Transaction.create({
        orderId: order._id,
        gatewayOrderId: order.orderNumber,
        amount: order.totalAmount,
        status: 'initiated',
        paymentSessionId: cashfreeOrder.paymentSessionId,
        retryCount: 0,
      });
    }

    // 14. Return payment session for Cashfree checkout redirect
    return NextResponse.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        transactionId: transaction._id,
        paymentSessionId: cashfreeOrder.paymentSessionId,
        cashfreeOrderId: cashfreeOrder.orderId,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        environment: process.env.CASHFREE_ENV || 'sandbox',
      },
    });
  } catch (error: any) {
    console.error('Error initiating payment:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate payment',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
