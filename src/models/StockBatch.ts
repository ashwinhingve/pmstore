import mongoose, { Schema, Document } from 'mongoose';

/**
 * A received lot of a product: batch number, expiry, what we paid, and how much
 * of it is left. This is the pharmacy's batch/expiry ledger — it sits ON TOP of
 * `Product.stock` (which stays the authoritative *sellable* number the
 * storefront reads). Purchases, opening-stock adjustments and stock-in
 * adjustments create batches and raise `Product.stock`; sales, out-adjustments
 * and purchase returns draw batches down FEFO (first-expiry-first-out).
 *
 * `Product.expiryDate` is kept in sync with the earliest live batch here, so the
 * expiry shown on the storefront always reflects real received stock.
 *
 * `costPrice`/`mrp` live per batch, not on the product, because they change from
 * one purchase to the next — stock valuation and margin must use the batch value.
 */
export interface IStockBatch extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  batchNumber: string;
  expiryDate?: Date;
  costPrice: number; // per-unit cost we paid (ex-scheme), rupees
  mrp?: number;
  gstRate?: number;
  quantityReceived: number;
  quantityRemaining: number;
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string; // snapshot for display
  purchaseId?: mongoose.Types.ObjectId;
  purchaseNumber?: string; // snapshot for display
  receivedAt: Date;
  isDepleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StockBatchSchema = new Schema<IStockBatch>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    batchNumber: { type: String, required: true, trim: true },
    expiryDate: { type: Date },
    costPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    gstRate: { type: Number },
    quantityReceived: { type: Number, required: true, min: 0 },
    quantityRemaining: { type: Number, required: true, min: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String, trim: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase' },
    purchaseNumber: { type: String, trim: true },
    receivedAt: { type: Date, default: Date.now },
    isDepleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// FEFO drawdown: for a product, pick live batches (quantityRemaining > 0)
// ordered by soonest expiry. receivedAt is the tiebreaker so no-expiry lots
// (devices) drain oldest-first.
StockBatchSchema.index({ productId: 1, isDepleted: 1, expiryDate: 1, receivedAt: 1 });
// Expiry reporting across the whole catalogue.
StockBatchSchema.index({ expiryDate: 1, quantityRemaining: 1 });

export default mongoose.models.StockBatch ||
  mongoose.model<IStockBatch>('StockBatch', StockBatchSchema);
