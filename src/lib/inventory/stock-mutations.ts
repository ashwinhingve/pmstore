import mongoose from 'mongoose';
import Product from '@/models/Product';
import StockBatch from '@/models/StockBatch';
import InventoryHistory from '@/models/InventoryHistory';
import type { IPurchase } from '@/models/Purchase';
import type { IInventoryAdjustment } from '@/models/InventoryAdjustment';
import type { IPurchaseReturn } from '@/models/PurchaseReturn';
import { AppError, Errors } from '@/lib/utils/errorHandler';

/**
 * The one place `Product.stock` and the StockBatch/InventoryHistory ledger move
 * together. Every stock change in the pharmacy — receiving a purchase, an online
 * or counter sale, a manual adjustment, a supplier return — goes through a
 * function here, so the batch ledger, the sellable `Product.stock` number and the
 * audit trail stay consistent, and the FEFO rule lives in exactly one spot.
 *
 * Operations are intentionally NOT wrapped in a MongoDB transaction: this order
 * volume doesn't warrant it, single-node dev/test has no replica set, and the
 * app already leans on manual reconciliation for the rare stock race (see the
 * payment callback + root CLAUDE.md scope guard). Out-movements are still safe
 * against overselling because the `Product.stock` decrement is a guarded atomic
 * update.
 */

type Id = mongoose.Types.ObjectId | string;

export interface MovementContext {
  userId?: Id;
}

/** Allocation produced when batches are drawn down FEFO. */
export interface BatchAllocation {
  batchId: mongoose.Types.ObjectId;
  batchNumber: string;
  expiryDate?: Date;
  taken: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Re-point `Product.expiryDate` at the earliest-expiring live batch, so the
 * expiry shown on the storefront always reflects real stock on the shelf. Unset
 * it when no live batch carries an expiry. Uses a plain updateOne — it touches
 * only `expiryDate`, never the price/composition inputs the Product derive hook
 * cares about (CLAUDE.md rule #2).
 */
export async function refreshProductExpiry(productId: Id): Promise<void> {
  const earliest = await StockBatch.findOne({
    productId,
    quantityRemaining: { $gt: 0 },
    expiryDate: { $ne: null },
  })
    .sort({ expiryDate: 1 })
    .select('expiryDate')
    .lean<{ expiryDate?: Date } | null>();

  await Product.updateOne(
    { _id: productId },
    earliest?.expiryDate
      ? { $set: { expiryDate: earliest.expiryDate } }
      : { $unset: { expiryDate: 1 } }
  );
}

/**
 * Draw `qty` units from a product's batches, first-expiry-first-out. Mutates the
 * batches' `quantityRemaining` (marking depleted ones) and returns what was taken
 * plus any `shortfall` the batches couldn't cover (legacy stock received before
 * batches existed). Does NOT touch `Product.stock` — the caller owns that number.
 */
export async function drawDownBatchesFEFO(
  productId: Id,
  qty: number
): Promise<{ allocations: BatchAllocation[]; shortfall: number }> {
  // FEFO: earliest expiry first. Sort in JS (not in Mongo) because an ascending
  // Mongo sort puts missing/null expiry FIRST — which would drain undated stock
  // (devices) before dated medicine. Here null-expiry lots sort LAST, then oldest
  // received first as the tiebreaker.
  const batches = await StockBatch.find({ productId, quantityRemaining: { $gt: 0 } });
  batches.sort((a, b) => {
    const ax = a.expiryDate ? a.expiryDate.getTime() : Infinity;
    const bx = b.expiryDate ? b.expiryDate.getTime() : Infinity;
    if (ax !== bx) return ax - bx;
    return (a.receivedAt?.getTime() ?? 0) - (b.receivedAt?.getTime() ?? 0);
  });

  let remaining = qty;
  const allocations: BatchAllocation[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityRemaining, remaining);
    batch.quantityRemaining -= take;
    if (batch.quantityRemaining === 0) batch.isDepleted = true;
    await batch.save();
    allocations.push({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      taken: take,
    });
    remaining -= take;
  }

  return { allocations, shortfall: remaining };
}

/**
 * Apply a received purchase to stock: one StockBatch per line, `Product.stock`
 * raised by quantity + free goods, a `purchase` ledger row, and the product's
 * expiry re-pointed at the earliest live batch. The caller (the route) is
 * responsible for marking the purchase `received` and guarding against calling
 * this twice — a purchase already `received` must never reach here.
 */
export async function receivePurchase(
  purchase: IPurchase,
  ctx: MovementContext = {}
): Promise<void> {
  const receivedAt = purchase.receivedAt ?? new Date();

  for (const item of purchase.items) {
    const totalQty = item.quantity + (item.freeQuantity ?? 0);
    if (totalQty <= 0) continue;

    const batch = await StockBatch.create({
      productId: item.productId,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      costPrice: item.costPrice,
      mrp: item.mrp,
      gstRate: item.gstRate,
      quantityReceived: totalQty,
      quantityRemaining: totalQty,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      purchaseId: purchase._id,
      purchaseNumber: purchase.purchaseNumber,
      receivedAt,
    });

    const updated = await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { stock: totalQty } },
      { new: true }
    ).select('stock');

    await InventoryHistory.create({
      productId: item.productId,
      productName: item.productName,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      type: 'purchase',
      quantityDelta: totalQty,
      balanceAfter: updated?.stock,
      refType: 'purchase',
      refId: purchase._id,
      refLabel: purchase.purchaseNumber,
      createdBy: ctx.userId,
    });

    await refreshProductExpiry(item.productId);
  }
}

/**
 * Record a sale against the batch ledger AFTER `Product.stock` has already been
 * decremented by the checkout/payment path (buildStockDecrement). This only
 * draws batches down FEFO and writes `sale` ledger rows — it never touches
 * `Product.stock` and never throws, so a bookkeeping hiccup can't fail a paid
 * order. Legacy products with no batches still get a ledger row (null batch).
 */
export interface SaleMovementItem {
  productId: Id;
  productName?: string;
  quantity: number;
}

export async function recordSaleMovement(
  items: SaleMovementItem[],
  ctx: MovementContext & { orderId?: Id; orderNumber?: string } = {}
): Promise<void> {
  try {
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) continue;
      const { allocations } = await drawDownBatchesFEFO(item.productId, item.quantity);

      const product = await Product.findById(item.productId)
        .select('stock name')
        .lean<{ stock?: number; name?: string } | null>();

      const base = {
        productId: item.productId,
        productName: item.productName ?? product?.name,
        type: 'sale' as const,
        balanceAfter: product?.stock,
        refType: 'order' as const,
        refId: ctx.orderId,
        refLabel: ctx.orderNumber,
        createdBy: ctx.userId,
      };

      if (allocations.length === 0) {
        await InventoryHistory.create({ ...base, quantityDelta: -item.quantity });
      } else {
        for (const a of allocations) {
          await InventoryHistory.create({
            ...base,
            batchId: a.batchId,
            batchNumber: a.batchNumber,
            quantityDelta: -a.taken,
          });
        }
      }

      await refreshProductExpiry(item.productId);
    }
  } catch (err) {
    // Ledger bookkeeping must never break a sale — flag for reconciliation.
    console.error('recordSaleMovement: inventory ledger update failed (the sale itself is unaffected):', err);
  }
}

/**
 * Apply a manual adjustment. `in` raises stock and (when batch details are
 * given) seeds a new batch — this is opening stock, restocks and customer
 * returns going back on the shelf. `out` lowers stock with a guarded atomic
 * decrement (so it can't oversell) and draws batches down FEFO — counter sales,
 * breakage, wastage, expiry write-offs. The adjustment document is created by
 * the caller; we mutate stock and write the ledger row.
 */
export async function applyAdjustment(
  adjustment: IInventoryAdjustment,
  ctx: MovementContext = {}
): Promise<void> {
  const qty = adjustment.quantity;

  if (adjustment.direction === 'in') {
    let batchId: mongoose.Types.ObjectId | undefined;
    let batchNumber: string | undefined;

    if (adjustment.batchNumber) {
      const batch = await StockBatch.create({
        productId: adjustment.productId,
        batchNumber: adjustment.batchNumber,
        expiryDate: adjustment.expiryDate,
        costPrice: adjustment.costPrice ?? 0,
        mrp: adjustment.mrp,
        quantityReceived: qty,
        quantityRemaining: qty,
        receivedAt: new Date(),
      });
      batchId = batch._id;
      batchNumber = batch.batchNumber;
      // Link the seeded batch back onto the adjustment record.
      adjustment.batchId = batch._id;
      await adjustment.save();
    }

    const updated = await Product.findByIdAndUpdate(
      adjustment.productId,
      { $inc: { stock: qty } },
      { new: true }
    ).select('stock');

    await InventoryHistory.create({
      productId: adjustment.productId,
      productName: adjustment.productName,
      batchId,
      batchNumber,
      type: adjustment.reason === 'opening' ? 'opening' : 'adjustment',
      quantityDelta: qty,
      balanceAfter: updated?.stock,
      reason: adjustment.reason,
      refType: 'adjustment',
      refId: adjustment._id,
      note: adjustment.note,
      createdBy: ctx.userId,
    });

    await refreshProductExpiry(adjustment.productId);
    return;
  }

  // direction === 'out' — guarded atomic decrement so we never oversell.
  const updated = await Product.findOneAndUpdate(
    { _id: adjustment.productId, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { new: true }
  ).select('stock name');

  if (!updated) {
    const current = await Product.findById(adjustment.productId).select('stock').lean<{ stock?: number } | null>();
    throw Errors.insufficientStock(adjustment.productName, current?.stock ?? 0, qty);
  }

  // A targeted batch (e.g. writing off a specific expired lot) is drawn first;
  // any remainder falls to FEFO. No target → straight FEFO.
  let allocations: BatchAllocation[] = [];
  if (adjustment.batchId) {
    const batch = await StockBatch.findById(adjustment.batchId);
    if (batch && batch.quantityRemaining > 0) {
      const take = Math.min(batch.quantityRemaining, qty);
      batch.quantityRemaining -= take;
      if (batch.quantityRemaining === 0) batch.isDepleted = true;
      await batch.save();
      allocations.push({ batchId: batch._id, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate, taken: take });
      if (take < qty) {
        const rest = await drawDownBatchesFEFO(adjustment.productId, qty - take);
        allocations = allocations.concat(rest.allocations);
      }
    } else {
      allocations = (await drawDownBatchesFEFO(adjustment.productId, qty)).allocations;
    }
  } else {
    allocations = (await drawDownBatchesFEFO(adjustment.productId, qty)).allocations;
  }

  const base = {
    productId: adjustment.productId,
    productName: adjustment.productName,
    type: 'adjustment' as const,
    balanceAfter: updated.stock,
    reason: adjustment.reason,
    refType: 'adjustment' as const,
    refId: adjustment._id,
    note: adjustment.note,
    createdBy: ctx.userId,
  };

  if (allocations.length === 0) {
    await InventoryHistory.create({ ...base, quantityDelta: -qty });
  } else {
    for (const a of allocations) {
      await InventoryHistory.create({
        ...base,
        batchId: a.batchId,
        batchNumber: a.batchNumber,
        quantityDelta: -a.taken,
      });
    }
  }

  await refreshProductExpiry(adjustment.productId);
}

/**
 * Apply a purchase return to a supplier: stock goes down. Every line is
 * stock-checked first (so a partial, hard-to-undo application can't happen
 * mid-loop), then each line decrements `Product.stock`, draws from the named
 * batch (or FEFO), writes a `purchase_return` ledger row, and refreshes expiry.
 */
export async function applyPurchaseReturn(
  ret: IPurchaseReturn,
  ctx: MovementContext = {}
): Promise<void> {
  // Pre-check: sum the return quantity per product and ensure stock covers it.
  const needed = new Map<string, number>();
  for (const item of ret.items) {
    const key = String(item.productId);
    needed.set(key, (needed.get(key) ?? 0) + item.quantity);
  }
  for (const [productId, qty] of needed) {
    const product = await Product.findById(productId).select('stock name').lean<{ stock?: number; name?: string } | null>();
    if (!product) throw Errors.notFound('Product', productId);
    if ((product.stock ?? 0) < qty) {
      throw Errors.insufficientStock(product.name ?? 'product', product.stock ?? 0, qty);
    }
  }

  for (const item of ret.items) {
    const qty = item.quantity;

    // Draw from the specific batch if one was named, else FEFO.
    if (item.batchId) {
      const batch = await StockBatch.findById(item.batchId);
      if (batch && batch.quantityRemaining > 0) {
        const take = Math.min(batch.quantityRemaining, qty);
        batch.quantityRemaining -= take;
        if (batch.quantityRemaining === 0) batch.isDepleted = true;
        await batch.save();
        if (take < qty) await drawDownBatchesFEFO(item.productId, qty - take);
      } else {
        await drawDownBatchesFEFO(item.productId, qty);
      }
    } else {
      await drawDownBatchesFEFO(item.productId, qty);
    }

    const updated = await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { stock: -qty } },
      { new: true }
    ).select('stock');

    await InventoryHistory.create({
      productId: item.productId,
      productName: item.productName,
      batchId: item.batchId,
      batchNumber: item.batchNumber,
      type: 'purchase_return',
      quantityDelta: -qty,
      balanceAfter: updated?.stock,
      reason: item.reason,
      refType: 'purchase_return',
      refId: ret._id,
      refLabel: ret.returnNumber,
      note: item.note,
      createdBy: ctx.userId,
    });

    await refreshProductExpiry(item.productId);
  }
}

/** Compute a purchase line's total (quantity × cost, free goods are cost-free). */
export function purchaseLineTotal(quantity: number, costPrice: number): number {
  return round2(quantity * costPrice);
}

export { AppError };
