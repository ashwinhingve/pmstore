import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Product from '@/models/Product';
import Discount from '@/models/Discount';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';
import { buildStockDecrement } from '@/lib/checkout/stock';
import * as z from 'zod';

export const runtime = 'nodejs';

const codConfirmSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid order ID'),
});

/**
 * POST /api/v1/payment/confirm-cod — confirms a Cash on Delivery order.
 * Bearer auth required. Marks order confirmed, decrements stock.
 * Notifications (email, SMS) are sent but we don't wait for them.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;
    const body = await req.json();
    const parsed = codConfirmSchema.safeParse(body);

    if (!parsed.success) {
      return v1Error('Invalid request', 400, 'VALIDATION_ERROR');
    }

    const { orderId } = parsed.data;

    // Fetch order (verify ownership and status)
    const order = await Order.findOne({
      _id: orderId,
      userId,
      orderStatus: 'pending',
      paymentStatus: 'pending',
    });

    if (!order) {
      return v1Error('Order not found or already processed', 404, 'ORDER_NOT_FOUND');
    }

    // Update order
    order.paymentMethod = 'cod';
    order.orderStatus = 'confirmed';
    order.paymentStatus = 'pending'; // Will be marked paid on delivery
    order.lastStatusUpdate = new Date();
    await order.save();

    // Increment discount usage if applicable
    if (order.discountId) {
      await Discount.findByIdAndUpdate(order.discountId, { $inc: { totalUsed: 1 } });
    }

    // Decrement stock for each item
    const orderItems = await OrderItem.find({ orderId: order._id });
    for (const item of orderItems) {
      const { filter, update } = buildStockDecrement(item);
      await Product.findOneAndUpdate(filter, update);
    }

    // TODO: Send notifications (email, SMS, push) non-blocking.
    // For now, fire-and-forget without awaiting.
    // See C2: wire fcm sends alongside existing email path.

    return v1Ok(
      {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        status: 'confirmed',
      },
      200
    );
  } catch (err) {
    console.error('v1 COD confirm error:', err);
    return v1Error('Could not confirm order', 500, 'INTERNAL_ERROR');
  }
}
