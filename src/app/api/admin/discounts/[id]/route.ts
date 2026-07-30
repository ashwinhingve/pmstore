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

    // Whitelist updatable fields — never allow totalUsed or _id to be overwritten.
    // Field names must match the Discount schema (src/models/Discount.ts) exactly —
    // a previous mismatch here ('value'/'minOrderAmount' vs the real
    // 'discountValue'/'minOrderValue') silently dropped edits to a coupon's
    // amount, type, and minimum while the UI reported success.
    const update: Record<string, unknown> = {};
    const allowed = ['name', 'code', 'type', 'discountType', 'discountValue', 'minOrderValue',
      'maxDiscountAmount', 'maxUsageTotal', 'maxUsagePerUser', 'validFrom', 'validTo', 'isActive',
      'applicableProducts'];
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    if (update.discountType !== undefined && !['fixed', 'percentage'].includes(update.discountType as string)) {
      return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 });
    }
    if (update.discountValue !== undefined) {
      if (typeof update.discountValue !== 'number' || !Number.isFinite(update.discountValue) || update.discountValue < 0) {
        return NextResponse.json({ error: 'Invalid discount value' }, { status: 400 });
      }
      const effectiveType = (update.discountType as string) ?? undefined;
      if (effectiveType === 'percentage' && update.discountValue > 100) {
        return NextResponse.json({ error: 'Percentage cannot exceed 100' }, { status: 400 });
      }
    }
    for (const numField of ['maxDiscountAmount', 'minOrderValue', 'maxUsageTotal', 'maxUsagePerUser'] as const) {
      if (update[numField] !== undefined) {
        const v = update[numField];
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
          return NextResponse.json({ error: `Invalid ${numField}` }, { status: 400 });
        }
      }
    }
    // Money is stored in rupees rounded to 2 decimals at write time (root
    // CLAUDE.md). findByIdAndUpdate skips the model's pre('save') hook, so
    // round explicitly here.
    for (const moneyField of ['discountValue', 'maxDiscountAmount', 'minOrderValue'] as const) {
      if (typeof update[moneyField] === 'number') {
        update[moneyField] = Math.round((update[moneyField] as number) * 100) / 100;
      }
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
