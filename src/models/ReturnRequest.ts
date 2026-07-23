import mongoose, { Schema, Document } from 'mongoose';

export interface IReturnRequest extends Document {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  userId: mongoose.Types.ObjectId;
  returnType: 'refund' | 'exchange';
  reason: string;
  reasonDetails?: string;
  items: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    sku: string;
    quantity: number;
    price: number;
    returnReason?: string;
  }[];
  refundAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  images?: string[];
  pickupAddress?: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  pickupScheduled?: Date;
  pickupCompleted?: Date;
  refundProcessed?: Date;
  refundTransactionId?: string;
  adminNotes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnRequestSchema = new Schema<IReturnRequest>(
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    returnType: {
      type: String,
      enum: ['refund', 'exchange'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 100,
    },
    reasonDetails: {
      type: String,
      maxlength: 500,
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        sku: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        returnReason: String,
      },
    ],
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    images: [String],
    pickupAddress: {
      name: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' },
    },
    pickupScheduled: Date,
    pickupCompleted: Date,
    refundProcessed: Date,
    refundTransactionId: String,
    adminNotes: {
      type: String,
      maxlength: 1000,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
ReturnRequestSchema.index({ userId: 1, createdAt: -1 });
ReturnRequestSchema.index({ orderId: 1 });
ReturnRequestSchema.index({ status: 1, createdAt: -1 });

const ReturnRequest =
  mongoose.models.ReturnRequest ||
  mongoose.model<IReturnRequest>('ReturnRequest', ReturnRequestSchema);

export default ReturnRequest;
