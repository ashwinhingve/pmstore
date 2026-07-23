import mongoose, { Schema, Document } from 'mongoose';

export interface IDiscount extends Document {
  _id: mongoose.Types.ObjectId;
  /** Coupon code (uppercase). Empty for auto/first_order types. */
  code: string;
  name: string;
  description: string;
  /** first_order = auto-applied to first-time buyers; auto = auto-applied always; coupon = manual code */
  type: 'first_order' | 'auto' | 'coupon';
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  /** For percentage discounts: cap the maximum discount (0 = no cap) */
  maxDiscountAmount: number;
  /** Minimum cart subtotal required (0 = no minimum) */
  minOrderValue: number;
  /** Total usage cap across all users (0 = unlimited) */
  maxUsageTotal: number;
  /** Max uses per individual user (0 = unlimited) */
  maxUsagePerUser: number;
  /** Running count of how many times this discount has been successfully used */
  totalUsed: number;
  validFrom: Date;
  /** null = no expiry */
  validTo: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    code: { type: String, default: '', trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['first_order', 'auto', 'coupon'],
      default: 'coupon',
    },
    discountType: {
      type: String,
      enum: ['fixed', 'percentage'],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, default: 0, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxUsageTotal: { type: Number, default: 0, min: 0 },
    maxUsagePerUser: { type: Number, default: 1, min: 0 },
    totalUsed: { type: Number, default: 0, min: 0 },
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DiscountSchema.index({ code: 1 });
DiscountSchema.index({ type: 1, isActive: 1 });

export default mongoose.models.Discount ||
  mongoose.model<IDiscount>('Discount', DiscountSchema);
