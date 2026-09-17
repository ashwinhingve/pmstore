import mongoose, { Schema, Document } from 'mongoose';

/**
 * Stock going BACK to a supplier — damaged, expired, near-expiry or wrong items.
 * Creating one immediately applies it (src/lib/inventory/stock-mutations
 * `applyPurchaseReturn()`): the returned quantity is drawn from the named batch
 * (or FEFO if none named), `Product.stock` drops, and an InventoryHistory row is
 * written. Only PURCHASE returns live here; customer returns stay manual via a
 * stock-in adjustment (see the plan's locked decisions and the CLAUDE.md scope guard).
 */
export type PurchaseReturnReason =
  | 'expired'
  | 'near_expiry'
  | 'damaged'
  | 'wrong_item'
  | 'overstock'
  | 'other';

export interface IPurchaseReturnItem {
  productId: mongoose.Types.ObjectId;
  productName: string; // snapshot
  batchId?: mongoose.Types.ObjectId;
  batchNumber?: string;
  quantity: number;
  costPrice: number;
  reason: PurchaseReturnReason;
  note?: string;
  lineTotal: number;
}

export interface IPurchaseReturn extends Document {
  _id: mongoose.Types.ObjectId;
  returnNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string; // snapshot
  purchaseId?: mongoose.Types.ObjectId;
  purchaseNumber?: string;
  items: IPurchaseReturnItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: 'completed';
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseReturnItemSchema = new Schema<IPurchaseReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'StockBatch' },
    batchNumber: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: ['expired', 'near_expiry', 'damaged', 'wrong_item', 'overstock', 'other'],
      required: true,
    },
    note: { type: String, trim: true },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseReturnSchema = new Schema<IPurchaseReturn>(
  {
    returnNumber: { type: String, required: true, unique: true, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    supplierName: { type: String, required: true, trim: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase' },
    purchaseNumber: { type: String, trim: true },
    items: { type: [PurchaseReturnItemSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['completed'], default: 'completed' },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PurchaseReturnSchema.index({ createdAt: -1 });

export default mongoose.models.PurchaseReturn ||
  mongoose.model<IPurchaseReturn>('PurchaseReturn', PurchaseReturnSchema);
