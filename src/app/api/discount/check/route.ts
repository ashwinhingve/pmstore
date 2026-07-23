import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import Discount from '@/models/Discount';
import Order from '@/models/Order';

/**
 * GET /api/discount/check
 * Returns all auto-applicable discounts for the current user:
 *   - first_order discount (if user has no previous orders)
 *   - any active 'auto' discounts within usage limits
 *
 * Also auto-seeds the default ₹10 first-order discount if none exists.
 */
export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const now = new Date();
    const applicable: any[] = [];

    // ── First-order discount ───────────────────────────────────
    let firstOrderDiscount = await Discount.findOne({
      type: 'first_order',
      isActive: true,
      validFrom: { $lte: now },
      $or: [{ validTo: null }, { validTo: { $gte: now } }],
    }).lean();

    // Auto-seed the default ₹10 first-order discount if none exists in DB
    if (!firstOrderDiscount) {
      const created = await Discount.create({
        code: '',
        name: 'First Order Discount',
        description: 'Welcome! Enjoy ₹10 off on your very first order.',
        type: 'first_order',
        discountType: 'fixed',
        discountValue: 10,
        minOrderValue: 0,
        maxUsagePerUser: 1,
        maxUsageTotal: 0,
        isActive: true,
      });
      firstOrderDiscount = created.toObject();
    }

    // Only show first-order discount to logged-in users who have no prior orders
    if (userId) {
      const priorOrders = await Order.countDocuments({
        userId,
        orderStatus: { $nin: ['cancelled'] },
      });

      if (priorOrders === 0) {
        applicable.push({
          id: (firstOrderDiscount as any)._id.toString(),
          code: '',
          name: (firstOrderDiscount as any).name,
          description: (firstOrderDiscount as any).description,
          type: 'first_order',
          discountType: (firstOrderDiscount as any).discountType,
          discountValue: (firstOrderDiscount as any).discountValue,
          maxDiscountAmount: (firstOrderDiscount as any).maxDiscountAmount ?? 0,
          minOrderValue: (firstOrderDiscount as any).minOrderValue ?? 0,
        });
      }
    }

    // ── Auto-applied discounts ─────────────────────────────────
    const autoDiscounts = await Discount.find({
      type: 'auto',
      isActive: true,
      validFrom: { $lte: now },
      $or: [{ validTo: null }, { validTo: { $gte: now } }],
    }).lean();

    for (const d of autoDiscounts) {
      // Total usage cap
      if ((d as any).maxUsageTotal > 0 && (d as any).totalUsed >= (d as any).maxUsageTotal) continue;

      // Per-user usage cap
      if (userId && (d as any).maxUsagePerUser > 0) {
        const used = await Order.countDocuments({
          userId,
          discountId: (d as any)._id,
          orderStatus: { $nin: ['cancelled'] },
        });
        if (used >= (d as any).maxUsagePerUser) continue;
      }

      applicable.push({
        id: (d as any)._id.toString(),
        code: (d as any).code || '',
        name: (d as any).name,
        description: (d as any).description,
        type: 'auto',
        discountType: (d as any).discountType,
        discountValue: (d as any).discountValue,
        maxDiscountAmount: (d as any).maxDiscountAmount ?? 0,
        minOrderValue: (d as any).minOrderValue ?? 0,
      });
    }

    return NextResponse.json({ success: true, discounts: applicable });
  } catch (error: any) {
    console.error('Discount check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
