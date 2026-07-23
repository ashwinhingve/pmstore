import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  transactionId: string; // Gateway transaction ID (e.g. Cashfree cf_order_id)
  gatewayOrderId: string; // Our order number sent to the gateway
  amount: number;
  status: 'initiated' | 'pending' | 'success' | 'failed' | 'refunded';
  paymentMethod?: 'card' | 'upi' | 'netbanking' | 'wallet';
  gatewayResponse?: any;
  paymentSessionId?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    transactionId: {
      type: String,
      sparse: true,
    },
    gatewayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['initiated', 'pending', 'success', 'failed', 'refunded'],
      default: 'initiated',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet'],
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },
    paymentSessionId: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (gatewayOrderId already indexed via unique: true, transactionId via sparse: true)
TransactionSchema.index({ orderId: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ createdAt: -1 });

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
