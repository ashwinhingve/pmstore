import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

/**
 * GET /api/v1/orders/[id] — full order detail + status timeline.
 * Bearer auth required. 403/404 if not the user's order.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(_req);
    if (authError) return authError;

    const userId = claims!.sub;
    const { id: orderId } = await params;

    // Only allow user to see their own orders
    const order = await Order.findOne({ _id: orderId, userId })
      .populate('items')
      .populate('shippingAddressId')
      .populate('billingAddressId')
      .lean<{ _id: unknown; items?: unknown[]; shippingAddressId?: unknown; billingAddressId?: unknown } | null>();

    if (!order) {
      return v1Error('Order not found', 404, 'NOT_FOUND');
    }

    const data = {
      ...order,
      _id: String(order._id),
      items: Array.isArray(order.items)
        ? order.items.map((item: any) => ({
          ...item,
          _id: String(item._id),
          productId: String(item.productId),
        }))
        : [],
      shippingAddressId: order.shippingAddressId
        ? {
          ...order.shippingAddressId,
          _id: String((order.shippingAddressId as any)._id),
        }
        : null,
      billingAddressId: order.billingAddressId
        ? {
          ...order.billingAddressId,
          _id: String((order.billingAddressId as any)._id),
        }
        : null,
    };

    return v1Ok({ order: data });
  } catch (err) {
    console.error('v1 order detail error:', err);
    return v1Error('Could not fetch order', 500, 'INTERNAL_ERROR');
  }
}
