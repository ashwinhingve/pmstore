import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp extends Document {
  email?: string;
  phoneNumber?: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
}

const OtpSchema = new Schema<IOtp>({
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000),
  },
  attempts: {
    type: Number,
    default: 0,
  },
});

OtpSchema.index({ email: 1 }, { sparse: true });
OtpSchema.index({ phoneNumber: 1 }, { sparse: true });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Otp || mongoose.model<IOtp>('Otp', OtpSchema);
