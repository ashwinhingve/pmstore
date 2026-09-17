import Product from '@/models/Product';
import StockBatch from '@/models/StockBatch';
import { EXPIRY_SOON_DAYS } from '@/lib/pharma/expiry';

/**
 * Read-only inventory rollups for the admin overview: what the stock on the
 * shelf is worth, and how much of it needs attention (low, out, expiring,
 * expired). Valuation reads the batch ledger, because cost and MRP live on the
 * batch (they change purchase to purchase) — the sellable count lives on Product.
 */

/** Fallback reorder point when a product has no per-product `reorderLevel`. */
export const LOW_STOCK_THRESHOLD = 10;

/**
 * Mongo match for "low stock": in stock but at/below the product's own
 * reorderLevel (falling back to LOW_STOCK_THRESHOLD). Shared by the overview
 * count, the stock filter and the main dashboard so they always agree.
 */
export const lowStockMatch = {
  $expr: {
    $and: [
      { $gt: ['$stock', 0] },
      { $lte: ['$stock', { $ifNull: ['$reorderLevel', LOW_STOCK_THRESHOLD] }] },
    ],
  },
} as const;

export interface InventoryOverview {
  stockValueAtCost: number;
  stockValueAtMrp: number;
  unitsInStock: number;
  liveBatches: number;
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  expiringSoon: number; // live batches expiring within EXPIRY_SOON_DAYS
  expired: number; // live batches already past expiry
}

export async function getInventoryOverview(): Promise<InventoryOverview> {
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRY_SOON_DAYS * 86_400_000);

  const [valueAgg, totalProducts, outOfStock, lowStock, expiringSoon, expired] =
    await Promise.all([
      StockBatch.aggregate<{
        _id: null;
        costValue: number;
        mrpValue: number;
        units: number;
        batches: number;
      }>([
        { $match: { quantityRemaining: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            costValue: { $sum: { $multiply: ['$quantityRemaining', '$costPrice'] } },
            mrpValue: {
              $sum: { $multiply: ['$quantityRemaining', { $ifNull: ['$mrp', 0] }] },
            },
            units: { $sum: '$quantityRemaining' },
            batches: { $sum: 1 },
          },
        },
      ]),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, stock: 0 }),
      Product.countDocuments({ isActive: true, ...lowStockMatch }),
      StockBatch.countDocuments({
        quantityRemaining: { $gt: 0 },
        expiryDate: { $gte: now, $lte: soon },
      }),
      StockBatch.countDocuments({
        quantityRemaining: { $gt: 0 },
        expiryDate: { $lt: now },
      }),
    ]);

  const agg = valueAgg[0];

  return {
    stockValueAtCost: Math.round((agg?.costValue ?? 0) * 100) / 100,
    stockValueAtMrp: Math.round((agg?.mrpValue ?? 0) * 100) / 100,
    unitsInStock: agg?.units ?? 0,
    liveBatches: agg?.batches ?? 0,
    totalProducts,
    outOfStock,
    lowStock,
    expiringSoon,
    expired,
  };
}
