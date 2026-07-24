import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';
import { diffReorder, type ReorderLine, type ProductSnapshot } from '@/lib/orders/reorder';

export const runtime = 'nodejs';

/**
 * POST /api/v1/orders/[id]/reorder — reorder diff for a past order.
 * Bearer auth required. Returns which items can be re-added and which can't.
 * Does NOT mutate the cart (client adds items itself).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(_req);
    if (authError) return authError;

    const userId = claims!.sub;
    const { id: orderId } = await params;

    // Fetch order (verify ownership)
    const order = await Order.findOne({ _id: orderId, userId })
      .populate('items')
      .lean<{ items: Record<string, unknown>[] } | null>();

    if (!order) {
      return v1Error('Order not found', 404, 'NOT_FOUND');
    }

    // Extract lines from order items
    const lines: ReorderLine[] = (order.items ?? []).map((it) => ({
      productId: String(it.productId),
      productName: String(it.productName ?? 'Item'),
      quantity: Number(it.quantity ?? 1),
      priceAtPurchase: Number(it.priceAtPurchase ?? 0),
    }));

    // Fetch current product state
    const products = await Product.find({ _id: { $in: lines.map((l) => l.productId) } })
      .select('name slug price stock isActive isDiscontinued prescriptionRequired')
      .lean<Array<ProductSnapshot & { _id: unknown }>>();

    const productsById: Record<string, ProductSnapshot> = {};
    for (const p of products) {
      const id = String(p._id);
      productsById[id] = {
        _id: id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        stock: p.stock,
        isActive: p.isActive,
        isDiscontinued: p.isDiscontinued,
        prescriptionRequired: p.prescriptionRequired,
      };
    }

    // Compute diff
    const diff = diffReorder(lines, productsById);

    return v1Ok({
      added: diff.added,
      skipped: diff.skipped,
    });
  } catch (err) {
    console.error('v1 reorder error:', err);
    return v1Error('Could not compute reorder', 500, 'INTERNAL_ERROR');
  }
}
