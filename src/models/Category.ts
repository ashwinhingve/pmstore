import mongoose, { Schema } from 'mongoose';

const categorySchema = new Schema(
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

const Category =
  mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
