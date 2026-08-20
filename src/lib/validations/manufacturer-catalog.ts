import * as z from 'zod';

export const manufacturerCatalogSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Manufacturer name is required')
    .max(120, 'Manufacturer name must be 120 characters or less'),
});

export type ManufacturerCatalogInput = z.infer<typeof manufacturerCatalogSchema>;
