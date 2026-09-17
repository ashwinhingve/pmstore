import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import StockBatch from '@/models/StockBatch';
import { lowStockMatch } from '@/lib/inventory/valuation';
import { EXPIRY_SOON_DAYS } from '@/lib/pharma/expiry';
import { handleInventoryError } from '@/lib/inventory/api-error';

/**
 * GET /api/admin/inventory/stock
 * Per-product sellable stock with its live batch breakdown (FEFO-ordered), for
 * the stock view and for the batch pickers in the adjustment/return forms.
 *
 * Filters: low | out | expiring | expired | all. `?productId=` returns just that
 * product with its batches (used by the forms).
 */
export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const search = searchParams.get('search');
    const filter = searchParams.get('filter'); // low | out | expiring | expired
    const productId = searchParams.get('productId');

    const select =
      'name sku manufacturer stock rackLocation reorderLevel expiryDate packSize packUnit mrp price isActive prescriptionRequired scheduleClass';

    const query: Record<string, unknown> = {};

    if (productId && /^[a-f\d]{24}$/i.test(productId)) {
      query._id = productId;
    } else {
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } },
        ];
      }
      if (filter === 'low') Object.assign(query, lowStockMatch);
      else if (filter === 'out') query.stock = 0;
      else if (filter === 'expiring' || filter === 'expired') {
        const now = new Date();
        const soon = new Date(now.getTime() + EXPIRY_SOON_DAYS * 86_400_000);
        const expiryMatch =
          filter === 'expired' ? { $lt: now } : { $gte: now, $lte: soon };
        const ids = await StockBatch.distinct('productId', {
          quantityRemaining: { $gt: 0 },
          expiryDate: expiryMatch,
        });
        query._id = { $in: ids };
      }
    }

    const [products, total] = await Promise.all([
      Product.find(query).select(select).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(query),
    ]);

    const ids = products.map((p) => p._id);
    const batches = await StockBatch.find({ productId: { $in: ids }, quantityRemaining: { $gt: 0 } })
      .select('productId batchNumber expiryDate quantityRemaining costPrice mrp supplierName purchaseNumber receivedAt')
      .lean();

    // FEFO display order: earliest expiry first, null-expiry last (matches how
    // drawDownBatchesFEFO consumes them, so the list reads in consumption order).
    const t = (d?: Date | null) => (d ? new Date(d).getTime() : Infinity);
    batches.sort((a, b) => {
      const ax = t(a.expiryDate);
      const bx = t(b.expiryDate);
      if (ax !== bx) return ax - bx;
      return (a.receivedAt ? new Date(a.receivedAt).getTime() : 0) - (b.receivedAt ? new Date(b.receivedAt).getTime() : 0);
    });

    const byProduct = new Map<string, unknown[]>();
    for (const b of batches) {
      const key = String(b.productId);
      const list = byProduct.get(key) ?? [];
      list.push(b);
      byProduct.set(key, list);
    }

    const data = products.map((p) => ({ ...p, batches: byProduct.get(String(p._id)) ?? [] }));

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
