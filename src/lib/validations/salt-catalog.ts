import * as z from 'zod';

export const saltCatalogSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Salt name is required')
    .max(120, 'Salt name must be 120 characters or less'),
});

export type SaltCatalogInput = z.infer<typeof saltCatalogSchema>;
