import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Supplier from '@/models/Supplier';
import Purchase from '@/models/Purchase';
import { supplierUpdateSchema } from '@/lib/validations/supplier';
import { handleInventoryError } from '@/lib/inventory/api-error';
import { Errors } from '@/lib/utils/errorHandler';

/** GET /api/admin/inventory/suppliers/[id] — supplier + purchase stats (count, outstanding). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  const { id } = await params;
  try {
    await connectDB();
    const supplier = await Supplier.findById(id).lean<({ _id: mongoose.Types.ObjectId } & Record<string, unknown>) | null>();
    if (!supplier) throw Errors.notFound('Supplier', id);

    const agg = await Purchase.aggregate<{ _id: null; count: number; total: number; paid: number }>([
      { $match: { supplierId: supplier._id, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$amountPaid' } } },
    ]);
    const s = agg[0];
    const outstanding = Math.round(((s?.total ?? 0) - (s?.paid ?? 0)) * 100) / 100;

    return NextResponse.json({
      data: supplier,
      stats: { purchaseCount: s?.count ?? 0, outstanding: Math.max(0, outstanding) },
    });
  } catch (err) {
    return handleInventoryError(err);
  }
}

/**
 * PUT /api/admin/inventory/suppliers/[id]
 * Update via load + set + save() so the pre('validate') hook re-derives nameLower.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  const { id } = await params;
  try {
    const validated = supplierUpdateSchema.parse(await req.json());
    await connectDB();
    const supplier = await Supplier.findById(id);
    if (!supplier) throw Errors.notFound('Supplier', id);
    supplier.set(validated);
    await supplier.save();
    return NextResponse.json({ data: supplier });
  } catch (err) {
    return handleInventoryError(err);
  }
}

/**
 * DELETE /api/admin/inventory/suppliers/[id]
 * Soft delete — a supplier is referenced by historic purchases/batches, so we
 * deactivate rather than remove.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  const { id } = await params;
  try {
    await connectDB();
    const supplier = await Supplier.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!supplier) throw Errors.notFound('Supplier', id);
    return NextResponse.json({ data: { id, isActive: false } });
  } catch (err) {
    return handleInventoryError(err);
  }
}
