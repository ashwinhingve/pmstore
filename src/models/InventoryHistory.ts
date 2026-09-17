import mongoose, { Schema, Document } from 'mongoose';

/**
 * The append-only stock ledger — one row per stock movement, never updated or
 * deleted. Every path that changes `Product.stock` (purchase receipt, sale,
 * adjustment, purchase return) writes one row here through
 * src/lib/inventory/stock-mutations, so the pharmacy has a complete audit trail
 * of who moved what, when and why (a regulatory expectation for medicines).
 *
 * `quantityDelta` is signed: +ve for stock in, -ve for stock out. `balanceAfter`
 * snapshots `Product.stock` right after the movement so the ledger reads without
 * recomputing running totals.
 */
export type InventoryMovementType =
  | 'opening'
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'purchase_return';

export type InventoryRefType = 'purchase' | 'order' | 'adjustment' | 'purchase_return';

export interface IInventoryHistory extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productName?: string; // snapshot for display
  batchId?: mongoose.Types.ObjectId;
  batchNumber?: string;
  type: InventoryMovementType;
  quantityDelta: number; // signed: +in, -out
  balanceAfter?: number; // Product.stock after this movement
  reason?: string;
  refType?: InventoryRefType;
  refId?: mongoose.Types.ObjectId;
  refLabel?: string; // e.g. purchase number, order number
  note?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryHistorySchema = new Schema<IInventoryHistory>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String },
    batchId: { type: Schema.Types.ObjectId, ref: 'StockBatch' },
    batchNumber: { type: String, trim: true },
    type: {
      type: String,
      enum: ['opening', 'purchase', 'sale', 'adjustment', 'purchase_return'],
      required: true,
    },
    quantityDelta: { type: Number, required: true },
    balanceAfter: { type: Number },
    reason: { type: String, trim: true },
    refType: { type: String, enum: ['purchase', 'order', 'adjustment', 'purchase_return'] },
    refId: { type: Schema.Types.ObjectId },
    refLabel: { type: String, trim: true },
    note: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

InventoryHistorySchema.index({ productId: 1, createdAt: -1 });
InventoryHistorySchema.index({ type: 1, createdAt: -1 });
InventoryHistorySchema.index({ createdAt: -1 });

export default mongoose.models.InventoryHistory ||
  mongoose.model<IInventoryHistory>('InventoryHistory', InventoryHistorySchema);
