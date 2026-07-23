import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Discount from '@/models/Discount';

/** PATCH /api/admin/discounts/[id] — update a discount */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { id } = await params;
    await connectDB();

    const body = await request.json();

    // Whitelist updatable fields — never allow totalUsed or _id to be overwritten
    const update: Record<string, unknown> = {};
    const allowed = ['name', 'code', 'type', 'value', 'minOrderAmount', 'maxDiscountAmount',
      'maxUsageTotal', 'maxUsagePerUser', 'validFrom', 'validTo', 'isActive', 'applicableProducts'];
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    if (update.code !== undefined) {
      const newCode = String(update.code).trim().toUpperCase();
      if (newCode) {
        const existing = await Discount.findOne({ code: newCode, _id: { $ne: id } });
        if (existing) {
          return NextResponse.json({ error: 'This coupon code already exists' }, { status: 400 });
        }
      }
      update.code = newCode;
    }

    if (update.validFrom) update.validFrom = new Date(update.validFrom as string);
    if (update.validTo) update.validTo = new Date(update.validTo as string);
    if (update.validTo === '') update.validTo = null;

    const discount = await Discount.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, discount });
  } catch (error: any) {
    console.error('Update discount error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** DELETE /api/admin/discounts/[id] — delete a discount */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { id } = await params;
    await connectDB();

    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Discount deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
