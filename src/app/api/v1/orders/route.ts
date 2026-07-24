import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

/**
 * GET /api/v1/orders — paginated orders for authenticated user.
 * Bearer auth required. Query: ?page=1&limit=10&status=pending
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
    const status = url.searchParams.get('status');

    // Build query
    const query: Record<string, unknown> = { userId };
    if (status) {
      query.orderStatus = status;
    }

    // Count and fetch
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('items')
        .lean<Array<{ _id: unknown; items?: unknown[] }>>(),
      Order.countDocuments(query),
    ]);

    const data = orders.map((o) => ({
      ...o,
      _id: String(o._id),
      items: Array.isArray(o.items)
        ? o.items.map((item: any) => ({
          ...item,
          _id: String(item._id),
          productId: String(item.productId),
        }))
        : [],
    }));

    return v1Ok({
      orders: data,
      meta: { page, limit, total },
    });
  } catch (err) {
    console.error('v1 orders list error:', err);
    return v1Error('Could not fetch orders', 500, 'INTERNAL_ERROR');
  }
}
