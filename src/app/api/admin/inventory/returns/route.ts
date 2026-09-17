import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Supplier from '@/models/Supplier';
import PurchaseReturn from '@/models/PurchaseReturn';
import { purchaseReturnSchema } from '@/lib/validations/purchase-return';
import { computePurchaseReturn } from '@/lib/inventory/purchase-math';
import { nextRef } from '@/lib/inventory/numbering';
import { applyPurchaseReturn } from '@/lib/inventory/stock-mutations';
import { handleInventoryError } from '@/lib/inventory/api-error';
import { Errors } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/inventory/returns
 * List purchase returns (paginated, filter by supplier, search number).
 */
export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const supplierId = searchParams.get('supplierId');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};
    if (supplierId && /^[a-f\d]{24}$/i.test(supplierId)) query.supplierId = supplierId;
    if (search) {
      query.$or = [
        { returnNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { purchaseNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [returns, total] = await Promise.all([
      PurchaseReturn.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PurchaseReturn.countDocuments(query),
    ]);

    const data = returns.map((r) => ({
      ...r,
      itemCount: Array.isArray(r.items) ? r.items.length : 0,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page, limit, total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    return handleInventoryError(err);
  }
}

/**
 * POST /api/admin/inventory/returns
 * Record + apply a purchase return (stock goes down FEFO / from the named batch).
 * If applying it fails (stock can't cover it), the record is removed.
 */
export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const validated = purchaseReturnSchema.parse(await req.json());
    await connectDB();

    const supplier = await Supplier.findById(validated.supplierId).select('name').lean<{ name?: string } | null>();
    if (!supplier) throw Errors.notFound('Supplier', validated.supplierId);

    const { items, subtotal, taxAmount, total } = computePurchaseReturn(validated.items);
    const returnNumber = await nextRef('PRET');

    const ret = await PurchaseReturn.create({
      returnNumber,
      supplierId: validated.supplierId,
      supplierName: supplier.name,
      purchaseId: validated.purchaseId,
      purchaseNumber: validated.purchaseNumber || undefined,
      items,
      subtotal,
      taxAmount,
      total,
      notes: validated.notes || undefined,
      createdBy: adminCheck.session?.user?.id,
    });

    try {
      await applyPurchaseReturn(ret, { userId: adminCheck.session?.user?.id });
    } catch (applyErr) {
      await ret.deleteOne();
      throw applyErr;
    }

    return NextResponse.json({ data: ret }, { status: 201 });
  } catch (err) {
    return handleInventoryError(err);
  }
}
