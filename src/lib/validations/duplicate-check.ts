import * as z from 'zod';

// Valid dosage forms per DosageForm type in src/lib/pharma/composition.ts
const dosageForms = [
  'tablet', 'capsule', 'syrup', 'suspension', 'injection',
  'cream', 'ointment', 'gel', 'drops', 'inhaler',
  'powder', 'sachet', 'spray', 'patch', 'other',
] as const;

export const duplicateCheckSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  salts: z.array(z.object({
    name: z.string().trim(),
    strength: z.number().optional(),
    unit: z.string().optional(),
  })).optional(),
  form: z.enum(dosageForms).optional(),
  manufacturer: z.string().trim().optional(),
  packSize: z.number().int().positive().optional(),
  currentProductId: z.string().optional(),
});

export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;
