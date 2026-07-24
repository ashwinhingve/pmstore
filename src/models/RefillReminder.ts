import mongoose, { Schema, Document } from 'mongoose';

/**
 * A scheduled nudge to reorder a repeat medicine before the customer runs out.
 *
 * One reminder per delivered order line, ever — the unique `orderItemId` index
 * guarantees a refill cron can't create duplicates if it runs twice. `dueAt` is
 * computed from pack size and quantity (see src/lib/pharma/refill.ts); the cron
 * picks up rows where `dueAt <= now` and `status === 'scheduled'`, sends the
 * email, and flips them to 'sent'.
 *
 * Health-data note (CLAUDE.md rule #6): store only the productId here, never the
 * medicine name or the customer's contact details. The cron joins Product/User
 * at send time and logs neither.
 */
export type RefillStatus = 'scheduled' | 'sent' | 'cancelled';

export interface IRefillReminder extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  orderItemId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  dueAt: Date;
  sentAt?: Date;
  status: RefillStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RefillReminderSchema = new Schema<IRefillReminder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    // Unique: exactly one reminder per delivered line, so a re-run can't duplicate.
    orderItemId: {
      type: Schema.Types.ObjectId,
      ref: 'OrderItem',
      required: true,
      unique: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    dueAt: { type: Date, required: true },
    sentAt: { type: Date },
    status: {
      type: String,
      enum: ['scheduled', 'sent', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
  },
  { timestamps: true }
);

// The cron's hot query: due-and-scheduled rows, oldest first.
RefillReminderSchema.index({ status: 1, dueAt: 1 });
RefillReminderSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.RefillReminder ||
  mongoose.model<IRefillReminder>('RefillReminder', RefillReminderSchema);
