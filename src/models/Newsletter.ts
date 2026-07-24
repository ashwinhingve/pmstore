import mongoose, { Schema, Document } from 'mongoose';
import { randomUUID } from 'crypto';

export interface INewsletter extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  unsubscribeToken: string;
  source?: string; // e.g., 'homepage', 'product_page', 'checkout'
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSchema = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    unsubscribeToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Generate unsubscribeToken on creation
NewsletterSchema.pre('save', function (next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = randomUUID();
  }
  next();
});

export default mongoose.models.Newsletter ||
  mongoose.model<INewsletter>('Newsletter', NewsletterSchema);
