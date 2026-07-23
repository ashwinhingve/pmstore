import mongoose, { Schema, Document } from 'mongoose';

export type PrescriptionStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface IPrescription extends Document {
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  images: { url: string; publicId: string }[];
  status: PrescriptionStatus;
  patientName?: string;
  doctorName?: string;
  issueDate?: Date;
  /** Set when the customer wants staff to build the cart for them. */
  buildCartRequested: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    images: {
      type: [{ url: { type: String, required: true }, publicId: { type: String, required: true } }],
      validate: [(v: unknown[]) => v.length > 0 && v.length <= 5, 'Upload between 1 and 5 images'],
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    patientName: { type: String, trim: true },
    doctorName: { type: String, trim: true },
    issueDate: Date,
    buildCartRequested: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// Admin queue: oldest pending first.
PrescriptionSchema.index({ status: 1, createdAt: 1 });
PrescriptionSchema.index({ userId: 1, createdAt: -1 });

// Indian prescriptions are generally treated as valid for 6 months.
PrescriptionSchema.methods.isExpired = function (this: IPrescription) {
  if (!this.issueDate) return false;
  const sixMonths = 1000 * 60 * 60 * 24 * 182;
  return Date.now() - this.issueDate.getTime() > sixMonths;
};

export default mongoose.models.Prescription ||
  mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
