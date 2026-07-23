import * as z from 'zod';

// Image validation schema
export const productImageSchema = z.object({
  _id: z.any().optional(),
  url: z.string().min(1, 'Image URL is required'),
  publicId: z.string().min(1, 'Public ID is required'),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string().optional(),
  order: z.number().min(0).default(0),
});

// Specification validation schema
export const productSpecificationSchema = z.object({
  _id: z.any().optional(),
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
  order: z.number().min(0).default(0),
});

// Variant validation schema
export const productVariantSchema = z.object({
  _id: z.any().optional(),
  id: z.string().min(1, 'Variant ID is required'),
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().min(1, 'SKU is required'),
  price: z.number().min(0, 'Price must be positive'),
  originalPrice: z.number().min(0).optional(),
  stock: z.number().min(0, 'Stock must be non-negative'),
  weight: z.number().min(0).optional(),
  weightUnit: z.enum(['g', 'kg', 'L', 'ml']).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().default(true),
});

// SEO validation schema
export const productSEOSchema = z.object({
  metaTitle: z.string().max(120, 'Meta title must be 120 characters or less').optional().or(z.literal('')),
  metaDescription: z.string().max(500, 'Meta description must be 500 characters or less').optional().or(z.literal('')),
  keywords: z.array(z.string()).default([]),
  ogImage: z.any().optional(),
});

// Salt validation schema (compositionKey is derived server-side, never accepted here)
export const saltSchema = z.object({
  name: z.string().min(1, 'Salt name is required'),
  strength: z.number().min(0, 'Strength must be non-negative'),
  unit: z.enum(['mg', 'mcg', 'g', 'ml', 'iu', '%']),
});

export const dosageFormEnum = z.enum([
  'tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream',
  'ointment', 'gel', 'drops', 'inhaler', 'powder', 'sachet', 'spray',
  'patch', 'other',
]);

export const scheduleClassEnum = z.enum(['OTC', 'H', 'H1', 'X', 'G']);

// Main product validation schema
export const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  longDescription: z.string().optional(),
  category: z.string().regex(/^[a-f\d]{24}$/i, 'A valid category is required'),
  subcategory: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  originalPrice: z.number().min(0).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  gstRate: z.number().refine((v) => [0, 5, 12, 18, 28].includes(v), {
    message: 'GST rate must be 0, 5, 12, 18, or 28',
  }).default(5),
  stock: z.number().min(0, 'Stock must be non-negative'),
  images: z
    .array(productImageSchema)
    .min(1, 'At least one image is required')
    .max(4, 'Maximum 4 images allowed'),
  weight: z.number().min(0).default(500),
  weightUnit: z.enum(['g', 'kg', 'L', 'ml']).default('g'),
  dimensions: z
    .object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      unit: z.string().default('cm'),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isValueBuy: z.boolean().default(false),
  specifications: z.array(productSpecificationSchema).default([]),
  variants: z.array(productVariantSchema).default([]),
  hasVariants: z.boolean().default(false),
  seo: productSEOSchema.default({
    metaTitle: undefined,
    metaDescription: undefined,
    keywords: [],
    ogImage: undefined,
  }),
  videoUrl: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().url().optional()
  ),
  relatedProducts: z.array(z.string()).optional(),
  // ---- Pharma ---- (compositionKey and unitPrice are DERIVED server-side, not accepted here)
  salts: z.array(saltSchema).min(1, 'At least one salt is required'),
  form: dosageFormEnum,
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  packSize: z.number().min(1, 'Pack size must be at least 1'),
  packUnit: z.string().min(1, 'Pack unit is required'),
  mrp: z.number().min(0).optional(),
  prescriptionRequired: z.boolean().default(false),
  scheduleClass: scheduleClassEnum.default('OTC'),
  hsnCode: z.string().optional(),
  storageInstructions: z.string().optional(),
  usageInstructions: z.string().optional(),
  sideEffects: z.array(z.string()).default([]),
  contraindications: z.array(z.string()).default([]),
  isDiscontinued: z.boolean().default(false),
});

// Type exports
export type ProductFormData = z.infer<typeof productSchema>;
export type ProductImageData = z.infer<typeof productImageSchema>;
export type ProductVariantData = z.infer<typeof productVariantSchema>;
export type ProductSpecificationData = z.infer<typeof productSpecificationSchema>;
export type ProductSEOData = z.infer<typeof productSEOSchema>;

// Partial schema for updates
export const productUpdateSchema = productSchema.partial();
