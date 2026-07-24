import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { sumSavings, type SavingLine } from '@/lib/orders/savings';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * GET /api/account/savings
 *
 * "You've saved ₹X this year." Sums (MRP − paid) × qty over the customer's
 * delivered orders for the current calendar year. MRP comes from today's
 * catalogue (OrderItem doesn't snapshot MRP in v1), so the figure is
 * approximate — and deliberately conservative: a line with no known MRP counts
 * zero, never a negative or invented saving (see lib/orders/savings.ts).
 */
export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw Errors.unauthorized();

    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const orders = await Order.find({
      userId: session.user.id,
      orderStatus: 'delivered',
      deliveredAt: { $gte: yearStart },
    })
      .populate('items')
      .lean<{ items: Record<string, unknown>[] }[]>();

    // Gather every purchased line, then join the current MRP in one query.
    const rawLines = orders.flatMap((o) => o.items ?? []);
    const productIds = [...new Set(rawLines.map((it) => String(it.productId)))];

    const products = await Product.find({ _id: { $in: productIds } })
      .select('mrp')
      .lean<Array<{ _id: unknown; mrp?: number }>>();
    const mrpById = new Map(products.map((p) => [String(p._id), p.mrp]));

    const lines: SavingLine[] = rawLines.map((it) => ({
      mrp: mrpById.get(String(it.productId)),
      price: Number(it.priceAtPurchase ?? 0),
      quantity: Number(it.quantity ?? 0),
    }));

    return NextResponse.json({
      data: { total: sumSavings(lines), year: yearStart.getFullYear() },
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}
