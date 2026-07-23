import mongoose, { Schema, Document } from 'mongoose';
import {
  buildCompositionKey,
  computeUnitPrice,
  type Salt,
  type DosageForm,
} from '@/lib/pharma/composition';

// Schedule class under the Drugs & Cosmetics Act (India)
export type ScheduleClass = 'OTC' | 'H' | 'H1' | 'X' | 'G';

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
  category: mongoose.Types.ObjectId;
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
  // ---- Pharma ----
  salts: Salt[];
  form: DosageForm;
  compositionKey: string; // DERIVED — buildCompositionKey(salts, form), never hand-entered
  manufacturer: string;
  packSize: number; // 15 tablets, 100 ml
  packUnit: string; // 'tablet' | 'ml' | 'g' | 'unit'
  unitPrice: number; // DERIVED — price / packSize, never hand-entered
  mrp?: number;
  prescriptionRequired: boolean;
  scheduleClass: ScheduleClass;
  hsnCode?: string;
  storageInstructions?: string;
  usageInstructions?: string;
  sideEffects: string[];
  contraindications: string[];
  isDiscontinued: boolean;
  orderCount: number; // rolling, powers the "most popular" badge
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
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
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
    // ---- Pharma ----
    salts: [
      {
        name: { type: String, required: true, trim: true },
        strength: { type: Number, required: true, min: 0 },
        unit: {
          type: String,
          enum: ['mg', 'mcg', 'g', 'ml', 'iu', '%'],
          required: true,
        },
      },
    ],
    form: {
      type: String,
      enum: [
        'tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream',
        'ointment', 'gel', 'drops', 'inhaler', 'powder', 'sachet', 'spray',
        'patch', 'other',
      ],
      required: true,
    },
    // DERIVED in pre('validate') — see below. Never hand-entered.
    compositionKey: { type: String, required: true, index: true },
    manufacturer: { type: String, required: true, trim: true, index: true },
    packSize: { type: Number, required: true, min: 1 }, // 15 tablets, 100 ml
    packUnit: { type: String, required: true }, // 'tablet' | 'ml' | 'g' | 'unit'
    // DERIVED in pre('validate') — price / packSize. Never hand-entered.
    unitPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    prescriptionRequired: { type: Boolean, default: false, index: true },
    scheduleClass: {
      type: String,
      enum: ['OTC', 'H', 'H1', 'X', 'G'],
      default: 'OTC',
    },
    hsnCode: { type: String, trim: true },
    storageInstructions: String,
    usageInstructions: String,
    sideEffects: { type: [String], default: [] },
    contraindications: { type: [String], default: [] },
    isDiscontinued: { type: Boolean, default: false },
    orderCount: { type: Number, default: 0 }, // rolling, for "most popular"
  },
  {
    timestamps: true,
  }
);

// Derive compositionKey and unitPrice — NEVER hand-entered (CLAUDE.md rule #2).
// Runs on pre('validate') so the derived values exist before required-validation.
// A pre('save') hook would run AFTER validation and the `required` checks on
// compositionKey/unitPrice would fail. Bulk paths that skip document middleware
// (insertMany/updateMany/findOneAndUpdate) must compute these explicitly.
ProductSchema.pre('validate', function (next) {
  if (this.salts?.length && (this.isModified('salts') || this.isModified('form'))) {
    this.compositionKey = buildCompositionKey(this.salts, this.form);
  }
  if (this.isModified('price') || this.isModified('packSize')) {
    this.unitPrice = computeUnitPrice(this.price, this.packSize);
  }
  next();
});

// Indexes (slug and sku already indexed via unique: true)
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ isFeatured: 1, isActive: 1 });
ProductSchema.index({ averageRating: -1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
// Pharma — the Strip: group same-composition brands, cheapest-per-unit first
ProductSchema.index({ compositionKey: 1, unitPrice: 1 });
ProductSchema.index({ compositionKey: 1, isActive: 1, stock: -1 });
ProductSchema.index({ prescriptionRequired: 1, isActive: 1 });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
