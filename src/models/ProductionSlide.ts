import mongoose, { Schema, Document } from 'mongoose';

export interface IProductionSlide extends Document {
  type: 'image' | 'video';
  src: string; // Cloudinary URL or local path
  publicId?: string; // Cloudinary public ID for deletion
  title: string;
  description: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductionSlideSchema = new Schema<IProductionSlide>(
  {
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    src: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ProductionSlideSchema.index({ order: 1 });
ProductionSlideSchema.index({ isActive: 1 });

export default mongoose.models.ProductionSlide ||
  mongoose.model<IProductionSlide>('ProductionSlide', ProductionSlideSchema);
