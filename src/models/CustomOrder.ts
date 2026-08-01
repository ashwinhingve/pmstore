import mongoose, { Schema, Document } from 'mongoose';

/**
 * Custom order — a consumer request for a medicine we may not stock ("can't
 * find your medicine? request it"). Lead capture only; staff follow up to source
 * it and build the order. Distinct from the B2B WholesaleEnquiry.
 */
export interface ICustomOrder extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  medicines: string;
  quantity?: string;
  deliveryArea?: string;
  pincode?: string;
  hasPrescription: boolean;
  notes?: string;
  /** Photos the customer attached (medicine pack, list, or prescription). */
  images: { url: string; publicId: string }[];
  status: 'new' | 'contacted' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const CustomOrderSchema = new Schema<ICustomOrder>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    medicines: { type: String, required: true, trim: true },
    quantity: { type: String, trim: true },
    deliveryArea: { type: String, trim: true },
    pincode: { type: String, trim: true },
    hasPrescription: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    // Stored private (Cloudinary access_mode: 'authenticated'); shown to staff
    // via signedImageUrl(). URLs are never logged (root CLAUDE.md rule #6).
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'closed'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CustomOrder ||
  mongoose.model<ICustomOrder>('CustomOrder', CustomOrderSchema);
