import * as z from 'zod';

export const duplicateCheckSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  salts: z.array(z.object({
    name: z.string().trim(),
    strength: z.number().optional(),
    unit: z.string().optional(),
  })).optional(),
  form: z.string().optional(),
  manufacturer: z.string().trim().optional(),
  packSize: z.number().optional(),
  currentProductId: z.string().optional(),
});

export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;
