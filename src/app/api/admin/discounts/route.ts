import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Discount from '@/models/Discount';

/** GET /api/admin/discounts — list all discounts */
export async function GET() {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const discounts = await Discount.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, discounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/admin/discounts — create a new discount */
export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const body = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.discountType || !['fixed', 'percentage'].includes(body.discountType)) {
      return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 });
    }
    if (typeof body.discountValue !== 'number' || body.discountValue < 0) {
      return NextResponse.json({ error: 'Invalid discount value' }, { status: 400 });
    }
    if (body.discountType === 'percentage' && body.discountValue > 100) {
      return NextResponse.json({ error: 'Percentage cannot exceed 100' }, { status: 400 });
    }
    if (body.type === 'coupon' && !body.code?.trim()) {
      return NextResponse.json({ error: 'Coupon code is required for coupon type' }, { status: 400 });
    }

    // Ensure unique coupon code
    if (body.code?.trim()) {
      const existing = await Discount.findOne({ code: body.code.trim().toUpperCase() });
      if (existing) {
        return NextResponse.json({ error: 'This coupon code already exists' }, { status: 400 });
      }
    }

    const discount = await Discount.create({
      code: body.code?.trim().toUpperCase() || '',
      name: body.name.trim(),
      description: body.description?.trim() || '',
      type: body.type || 'coupon',
      discountType: body.discountType,
      discountValue: body.discountValue,
      maxDiscountAmount: body.maxDiscountAmount ?? 0,
      minOrderValue: body.minOrderValue ?? 0,
      maxUsageTotal: body.maxUsageTotal ?? 0,
      maxUsagePerUser: body.maxUsagePerUser ?? 1,
      validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
      validTo: body.validTo ? new Date(body.validTo) : null,
      isActive: body.isActive !== false,
    });

    return NextResponse.json({ success: true, discount }, { status: 201 });
  } catch (error: any) {
    console.error('Create discount error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
