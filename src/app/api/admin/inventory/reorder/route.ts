import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import StockBatch from '@/models/StockBatch';
import { LOW_STOCK_THRESHOLD } from '@/lib/inventory/valuation';
import { handleInventoryError } from '@/lib/inventory/api-error';

/**
 * GET /api/admin/inventory/reorder
 * Products that need reordering — active and at/below their reorder level
 * (out-of-stock included). Each row carries the last supplier we bought it from
 * and a suggested order quantity. Most urgent (lowest stock) first.
 */
export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

    // stock <= reorderLevel (fallback 10) — includes out-of-stock.
    const match = {
      isActive: true,
      $expr: { $lte: ['$stock', { $ifNull: ['$reorderLevel', LOW_STOCK_THRESHOLD] }] },
    };

    const [products, total] = await Promise.all([
      Product.find(match)
        .select('name sku manufacturer stock reorderLevel packSize packUnit')
        .sort({ stock: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(match),
    ]);

    // Last supplier per product — the most recently received batch.
    const ids = products.map((p) => p._id);
    const lastBatches = await StockBatch.aggregate<{ _id: mongoose.Types.ObjectId; supplierName?: string; supplierId?: mongoose.Types.ObjectId }>([
      { $match: { productId: { $in: ids } } },
      { $sort: { receivedAt: -1 } },
      { $group: { _id: '$productId', supplierName: { $first: '$supplierName' }, supplierId: { $first: '$supplierId' } } },
    ]);
    const supplierByProduct = new Map(lastBatches.map((b) => [String(b._id), b]));

    const data = products.map((p) => {
      const level = p.reorderLevel ?? LOW_STOCK_THRESHOLD;
      const last = supplierByProduct.get(String(p._id));
      return {
        _id: p._id,
        name: p.name,
        sku: p.sku,
        manufacturer: p.manufacturer,
        stock: p.stock,
        reorderLevel: level,
        packUnit: p.packUnit,
        suggestedQty: Math.max(level - p.stock, 0),
        lastSupplierName: last?.supplierName ?? null,
        lastSupplierId: last?.supplierId ?? null,
      };
    });

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
