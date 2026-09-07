import * as z from 'zod';

// Valid salt units per SaltUnit type in src/lib/pharma/composition.ts
const saltUnits = ['mg', 'mcg', 'g', 'ml', 'iu', '%'] as const;

// Valid dosage forms per DosageForm type in src/lib/pharma/composition.ts
const dosageForms = [
  'tablet', 'capsule', 'syrup', 'suspension', 'injection',
  'cream', 'ointment', 'gel', 'drops', 'inhaler',
  'powder', 'sachet', 'spray', 'patch', 'other',
] as const;

// Valid schedule classes
const scheduleClasses = ['OTC', 'H', 'H1', 'X', 'G'] as const;

/**
 * Schema for a single product row in a bulk JSON import request.
 * Mirrors the structured internal representation (ParsedProductRow),
 * but without derived fields (compositionKey, unitPrice).
 *
 * Salts must be provided as a structured array, not as shorthand text.
 * Images are referenced by SKU (already uploaded to Cloudinary).
 */
export const bulkProductRowSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  name: z.string().trim().min(1, 'Name is required'),
  brand: z.string().trim().optional(),
  manufacturer: z.string().trim().min(1, 'Manufacturer is required'),
  category: z.string().trim().min(1, 'Category name is required'),
  // Salts must be structured (not shorthand text) — frontend parses shorthand if needed
  salts: z.array(
    z.object({
      name: z.string().trim().min(1, 'Salt name is required'),
      strength: z.number().min(0, 'Strength must be non-negative'),
      unit: z.enum(saltUnits),
    })
  ),
  form: z.enum(dosageForms),
  packSize: z.number().min(1, 'Pack size must be at least 1'),
  packUnit: z.string().trim().min(1, 'Pack unit is required'),
  price: z.number().min(0, 'Price must be non-negative'),
  mrp: z.number().min(0, 'MRP must be non-negative').optional(),
  gstRate: z
    .number()
    .refine((v) => [0, 5, 12, 18, 28].includes(v), {
      message: 'GST rate must be 0, 5, 12, 18, or 28',
    })
    .default(5),
  stock: z.number().min(0, 'Stock must be non-negative').default(0),
  scheduleClass: z.enum(scheduleClasses).default('OTC'),
  prescriptionRequired: z.boolean().default(false),
  description: z.string().trim().default(''),
  hsnCode: z.string().trim().optional(),
  storageInstructions: z.string().trim().optional(),
  usageInstructions: z.string().trim().optional(),
  sideEffects: z.array(z.string().trim()).default([]),
  contraindications: z.array(z.string().trim()).default([]),
  tags: z.array(z.string().trim()).default([]),
  isActive: z.boolean().default(true),
  // Optional: if present, 'image' is the SKU key to look up in the images map
  image: z.string().trim().optional(),
});

export type BulkProductRow = z.infer<typeof bulkProductRowSchema>;

/**
 * Schema for the bulk import request body (JSON).
 * Frontend uploads images separately, then passes their URLs/publicIds here.
 */
export const bulkProductImportBodySchema = z.object({
  rows: z.array(bulkProductRowSchema),
  // Optional: map of SKU → { url, publicId } for pre-uploaded images
  images: z
    .record(
      z.string(),
      z.object({
        url: z.string().url('Image URL must be valid'),
        publicId: z.string().min(1, 'Public ID is required'),
      })
    )
    .optional(),
});

export type BulkProductImportBody = z.infer<typeof bulkProductImportBodySchema>;
