import mongoose, { Schema, Document } from 'mongoose';

// Image interface with Cloudinary metadata
export interface IProductImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  order: number;
}

// Specification interface
export interface IProductSpecification {
  key: string;
  value: string;
  order: number;
}

// Variant interface
export interface IProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
  stock: number;
  weight?: number;
  weightUnit?: string;
  attributes?: Record<string, string>;
  isActive: boolean;
}

// SEO interface
export interface IProductSEO {
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  ogImage?: string;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string;
  longDescription?: string;
  category: string;
  subcategory?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  stock: number;
  images: IProductImage[];
  weight: number; // Weight in grams
  weightUnit: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  tags: string[];
  specifications: IProductSpecification[];
  variants: IProductVariant[];
  hasVariants: boolean;
  seo: IProductSEO;
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isTrending: boolean;
  isValueBuy: boolean;
  averageRating: number;
  totalReviews: number;
  gstRate: number; // 0 | 5 | 12 | 18 | 28 — GST rate; product price is GST-inclusive
  videoUrl?: string;
  relatedProducts?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      trim: true,
    },
    longDescription: {
      type: String,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
          width: Number,
          height: Number,
          format: String,
          order: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    weight: {
      type: Number,
      default: 500, // Default 500 grams
      min: 0,
    },
    weightUnit: {
      type: String,
      default: 'g',
      enum: ['g', 'kg', 'L', 'ml'],
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        default: 'cm',
      },
    },
    tags: {
      type: [String],
      default: [],
    },
    specifications: {
      type: [
        {
          key: { type: String, required: true },
          value: { type: String, required: true },
          order: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    variants: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          sku: { type: String, required: true },
          price: { type: Number, required: true, min: 0 },
          originalPrice: { type: Number, min: 0 },
          stock: { type: Number, required: true, min: 0 },
          weight: Number,
          weightUnit: { type: String, enum: ['g', 'kg', 'L', 'ml'] },
          attributes: { type: Map, of: String },
          isActive: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    hasVariants: {
      type: Boolean,
      default: false,
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: { type: [String], default: [] },
      ogImage: String,
    },
    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 5,
    },
    videoUrl: {
      type: String,
    },
    relatedProducts: {
      type: [Schema.Types.ObjectId],
      ref: 'Product',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    isValueBuy: {
      type: Boolean,
      default: false,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (slug and sku already indexed via unique: true)
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ isFeatured: 1, isActive: 1 });
ProductSchema.index({ averageRating: -1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
