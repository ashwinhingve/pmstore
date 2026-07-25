import { z } from 'zod';

/**
 * Admin bulk-action payloads. Activation only touches `isActive` — no derived
 * fields — so the route can bulkWrite without recomputing anything.
 */
export const bulkActiveSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid product id'))
    .min(1)
    .max(500),
  isActive: z.boolean(),
});

export type BulkActiveInput = z.infer<typeof bulkActiveSchema>;
