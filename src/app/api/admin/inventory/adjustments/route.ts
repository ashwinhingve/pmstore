import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import InventoryAdjustment from '@/models/InventoryAdjustment';
import { adjustmentSchema } from '@/lib/validations/inventory-adjustment';
import { applyAdjustment } from '@/lib/inventory/stock-mutations';
import { handleInventoryError } from '@/lib/inventory/api-error';
import { Errors } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/inventory/adjustments
 * List manual adjustments (paginated, filter by product/direction).
 */
export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const productId = searchParams.get('productId');
    const direction = searchParams.get('direction');

    const query: Record<string, unknown> = {};
    if (productId && /^[a-f\d]{24}$/i.test(productId)) query.productId = productId;
    if (direction === 'in' || direction === 'out') query.direction = direction;

    const [adjustments, total] = await Promise.all([
      InventoryAdjustment.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      InventoryAdjustment.countDocuments(query),
    ]);

    return NextResponse.json({
      data: adjustments,
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
 * POST /api/admin/inventory/adjustments
 * Record + apply a manual adjustment. If applying it fails (e.g. an `out` that
 * would oversell), the adjustment record is removed so it never lingers as a
 * change that didn't happen.
 */
export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const validated = adjustmentSchema.parse(await req.json());
    await connectDB();

    const product = await Product.findById(validated.productId).select('name').lean<{ name?: string } | null>();
    if (!product) throw Errors.notFound('Product', validated.productId);

    const adjustment = await InventoryAdjustment.create({
      productId: validated.productId,
      productName: product.name,
      direction: validated.direction,
      quantity: validated.quantity,
      reason: validated.reason,
      batchId: validated.batchId || undefined,
      batchNumber: validated.batchNumber || undefined,
      expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : undefined,
      costPrice: validated.costPrice,
      mrp: validated.mrp,
      note: validated.note || undefined,
      createdBy: adminCheck.session?.user?.id,
    });

    try {
      await applyAdjustment(adjustment, { userId: adminCheck.session?.user?.id });
    } catch (applyErr) {
      // Roll back the record — the stock change didn't happen.
      await adjustment.deleteOne();
      throw applyErr;
    }

    return NextResponse.json({ data: adjustment }, { status: 201 });
  } catch (err) {
    return handleInventoryError(err);
  }
}
