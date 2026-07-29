import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  icon: string;
  image: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    icon: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
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
  { timestamps: true }
);

// Category listings filter by active + sort by display order.
categorySchema.index({ isActive: 1, order: 1 });

const Category =
  mongoose.models.Category || mongoose.model<ICategory>('Category', categorySchema);

export default Category;
