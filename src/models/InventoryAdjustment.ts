import mongoose, { Schema, Document } from 'mongoose';

/**
 * A manual stock correction — the escape hatch for everything that isn't a
 * purchase, a sale or a supplier return. Two directions:
 *
 *  - `in`  raises stock and (for `opening`/restock) can seed a new StockBatch
 *          with its own batch number, expiry and cost. This is how legacy
 *          products with a bare `Product.stock` and no batches get an opening
 *          batch, and how a customer return is put back on the shelf.
 *  - `out` lowers stock and draws batches down FEFO. This is how offline/counter
 *          sales, breakage, wastage and expiry write-offs leave the system
 *          (the locked decision: no separate POS — counter sales are an `out`).
 *
 * Every adjustment writes an InventoryHistory row via
 * src/lib/inventory/stock-mutations `applyAdjustment()`.
 */
export type AdjustmentDirection = 'in' | 'out';

export type AdjustmentReason =
  | 'opening'
  | 'recount'
  | 'counter_sale'
  | 'damage'
  | 'wastage'
  | 'expiry_writeoff'
  | 'customer_return'
  | 'found'
  | 'other';

export interface IInventoryAdjustment extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productName: string; // snapshot
  direction: AdjustmentDirection;
  quantity: number;
  reason: AdjustmentReason;
  // Only used for `in` adjustments that seed a batch (opening stock / restock).
  batchId?: mongoose.Types.ObjectId;
  batchNumber?: string;
  expiryDate?: Date;
  costPrice?: number;
  mrp?: number;
  note?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryAdjustmentSchema = new Schema<IInventoryAdjustment>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    direction: { type: String, enum: ['in', 'out'], required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: {
      type: String,
      enum: [
        'opening', 'recount', 'counter_sale', 'damage', 'wastage',
        'expiry_writeoff', 'customer_return', 'found', 'other',
      ],
      required: true,
    },
    batchId: { type: Schema.Types.ObjectId, ref: 'StockBatch' },
    batchNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    costPrice: { type: Number, min: 0 },
    mrp: { type: Number, min: 0 },
    note: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

InventoryAdjustmentSchema.index({ createdAt: -1 });

export default mongoose.models.InventoryAdjustment ||
  mongoose.model<IInventoryAdjustment>('InventoryAdjustment', InventoryAdjustmentSchema);
