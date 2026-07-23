import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import Discount from '@/models/Discount';
import Order from '@/models/Order';

/**
 * POST /api/discount/validate
 * Body: { code: string, subtotal: number }
 *
 * Validates a coupon code for the current user and returns the discount details.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Please log in to apply a coupon' },
        { status: 401 }
      );
    }

    const { code, subtotal } = await request.json();

    if (!code?.trim()) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }
    if (typeof subtotal !== 'number' || subtotal < 0) {
      return NextResponse.json({ error: 'Invalid subtotal' }, { status: 400 });
    }

    await connectDB();

    const now = new Date();
    const discount = await Discount.findOne({
      code: code.trim().toUpperCase(),
      type: 'coupon',
    }).lean() as any;

    if (!discount) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
    }
    if (!discount.isActive) {
      return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 400 });
    }
    if (discount.validFrom > now) {
      return NextResponse.json({ error: 'This coupon is not yet valid' }, { status: 400 });
    }
    if (discount.validTo && discount.validTo < now) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
    }
    if (discount.minOrderValue > 0 && subtotal < discount.minOrderValue) {
      return NextResponse.json(
        { error: `Minimum order value of ₹${discount.minOrderValue} required for this coupon` },
        { status: 400 }
      );
    }
    if (discount.maxUsageTotal > 0 && discount.totalUsed >= discount.maxUsageTotal) {
      return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 });
    }

    // Per-user usage check
    if (discount.maxUsagePerUser > 0) {
      const used = await Order.countDocuments({
        userId: session.user.id,
        discountId: discount._id,
        orderStatus: { $nin: ['cancelled'] },
      });
      if (used >= discount.maxUsagePerUser) {
        return NextResponse.json({ error: 'You have already used this coupon' }, { status: 400 });
      }
    }

    // Compute discount amount
    let amount = 0;
    if (discount.discountType === 'fixed') {
      amount = discount.discountValue;
    } else {
      amount = (subtotal * discount.discountValue) / 100;
      if (discount.maxDiscountAmount > 0) {
        amount = Math.min(amount, discount.maxDiscountAmount);
      }
    }
    amount = Math.min(Math.round(amount * 100) / 100, subtotal);

    return NextResponse.json({
      success: true,
      discount: {
        id: discount._id.toString(),
        code: discount.code,
        name: discount.name,
        description: discount.description,
        type: discount.type,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        maxDiscountAmount: discount.maxDiscountAmount,
        minOrderValue: discount.minOrderValue,
        amount,
      },
    });
  } catch (error: any) {
    console.error('Validate coupon error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
