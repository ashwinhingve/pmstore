import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { diffReorder, type ReorderLine, type ProductSnapshot } from '@/lib/orders/reorder';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * POST /api/orders/:orderId/reorder
 *
 * Returns the reorder diff for a past order — which lines can go back in the
 * cart today and which can't (out of stock, discontinued, now prescription-
 * only). It does NOT mutate the cart: the cart lives in the client's Zustand
 * store (localStorage), so the client takes `added` and adds those itself.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw Errors.unauthorized('Sign in to reorder');

    const { orderId } = await params;

    // Own-order only — never let a user reorder someone else's order.
    const order = await Order.findOne({ _id: orderId, userId: session.user.id })
      .populate('items')
      .lean<{ items: Record<string, unknown>[] } | null>();

    if (!order) throw Errors.notFound('Order', orderId);

    const lines: ReorderLine[] = (order.items ?? []).map((it) => ({
      productId: String(it.productId),
      productName: String(it.productName ?? 'Item'),
      quantity: Number(it.quantity ?? 1),
      priceAtPurchase: Number(it.priceAtPurchase ?? 0),
    }));

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

    const diff = diffReorder(lines, productsById);
    return NextResponse.json({ data: diff });
  } catch (err) {
    return createErrorResponse(err);
  }
}
