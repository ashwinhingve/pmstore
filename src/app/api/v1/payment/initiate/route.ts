import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';
import { applyRateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { cashfreeService } from '@/lib/payment/cashfree';
import * as z from 'zod';

export const runtime = 'nodejs';

const initiatePaymentSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid order ID'),
});

/**
 * POST /api/v1/payment/initiate — starts a payment flow (Cashfree).
 * Bearer auth required. Returns paymentSessionId for mobile to redirect to.
 */
export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, RateLimitPresets.PAYMENT_INITIATE);
  if (rateLimited) return rateLimited;

  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;
    const body = await req.json();
    const parsed = initiatePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return v1Error('Invalid request', 400, 'VALIDATION_ERROR');
    }

    const { orderId } = parsed.data;

    // Fetch order (verify ownership)
    const order = await Order.findOne({
      _id: orderId,
      userId,
      orderStatus: 'pending',
      paymentStatus: 'pending',
    });

    if (!order) {
      return v1Error('Order not found or already processed', 404, 'ORDER_NOT_FOUND');
    }

    // Check for existing successful transaction
    const existingSuccess = await Transaction.findOne({
      orderId: order._id,
      status: 'success',
    });

    if (existingSuccess) {
      return v1Error('Payment already completed', 400, 'ALREADY_PAID');
    }

    // Fetch user for customer details
    const user = await User.findById(userId);
    if (!user) {
      return v1Error('User not found', 404, 'USER_NOT_FOUND');
    }

    // Create or reuse a pending/initiated transaction
    let transaction = await Transaction.findOne({
      orderId: order._id,
      status: { $in: ['initiated', 'pending'] },
    });

    // Create Cashfree order
    const cashfreeOrder = await cashfreeService.createOrder({
      orderId: order.orderNumber,
      orderAmount: order.totalAmount,
      customerName: user.name || 'Customer',
      customerEmail: user.email || '',
      customerPhone: user.phone || '9999999999',
    });

    // Create or update transaction
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

    return v1Ok(
      {
        transactionId: String(transaction._id),
        paymentSessionId: cashfreeOrder.paymentSessionId,
        orderId: String(order._id),
        amount: order.totalAmount,
      },
      200
    );
  } catch (err) {
    console.error('v1 payment initiate error:', err);
    return v1Error('Could not initiate payment', 500, 'INTERNAL_ERROR');
  }
}
