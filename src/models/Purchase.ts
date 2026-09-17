import mongoose, { Schema, Document } from 'mongoose';

/**
 * A purchase records stock coming IN from a supplier — the goods-receipt plus
 * the supplier's invoice, together. While `status` is draft/ordered it is just a
 * document; the moment it is marked `received`, src/lib/inventory/stock-mutations
 * `receivePurchase()` turns each line into a StockBatch, raises `Product.stock`
 * and writes an InventoryHistory row. Receiving is guarded by `receivedAt` so it
 * can never run twice for the same purchase.
 *
 * Supplier money is tracked minimally here (paymentStatus + amountPaid) — there
 * is no separate accounts-payable ledger (see the plan's locked decisions).
 */
export interface IPurchaseItem {
  productId: mongoose.Types.ObjectId;
  productName: string; // snapshot
  batchNumber: string;
  expiryDate?: Date;
  quantity: number;
  freeQuantity: number; // scheme goods received free — added to stock, cost 0
  costPrice: number; // per-unit, rupees
  mrp?: number;
  gstRate?: number;
  lineTotal: number; // quantity * costPrice, rounded to 2dp
}

export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'cancelled';
export type PurchasePaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface IPurchaseAttachment {
  url: string;
  publicId: string;
  name: string;
}

export interface IPurchase extends Document {
  _id: mongoose.Types.ObjectId;
  purchaseNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string; // snapshot
  invoiceNumber?: string;
  invoiceDate?: Date;
  status: PurchaseStatus;
  items: IPurchaseItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentStatus: PurchasePaymentStatus;
  amountPaid: number;
  notes?: string;
  attachments: IPurchaseAttachment[];
  receivedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    batchNumber: { type: String, required: true, trim: true },
    expiryDate: { type: Date },
    quantity: { type: Number, required: true, min: 1 },
    freeQuantity: { type: Number, default: 0, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    gstRate: { type: Number },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    purchaseNumber: { type: String, required: true, unique: true, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    supplierName: { type: String, required: true, trim: true },
    invoiceNumber: { type: String, trim: true },
    invoiceDate: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'ordered', 'received', 'cancelled'],
      default: 'draft',
      index: true,
    },
    items: { type: [PurchaseItemSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    amountPaid: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
          name: { type: String, default: '' },
        },
      ],
      default: [],
    },
    receivedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PurchaseSchema.index({ createdAt: -1 });

export default mongoose.models.Purchase ||
  mongoose.model<IPurchase>('Purchase', PurchaseSchema);
