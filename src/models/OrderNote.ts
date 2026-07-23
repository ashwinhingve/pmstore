import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderNote extends Document {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  adminEmail: string;
  note: string;
  isInternal: boolean; // Internal notes (admin only) vs customer-visible notes
  createdAt: Date;
  updatedAt: Date;
}

const OrderNoteSchema = new Schema<IOrderNote>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    isInternal: {
      type: Boolean,
      default: true, // By default, notes are internal (admin-only)
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
OrderNoteSchema.index({ orderId: 1, createdAt: -1 });
OrderNoteSchema.index({ orderNumber: 1, createdAt: -1 });

const OrderNote =
  mongoose.models.OrderNote ||
  mongoose.model<IOrderNote>('OrderNote', OrderNoteSchema);

export default OrderNote;
