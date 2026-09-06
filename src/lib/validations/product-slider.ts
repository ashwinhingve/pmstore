import * as z from 'zod';
import { isValidObjectId } from 'mongoose';

/**
 * Validates that a string is a valid MongoDB ObjectId
 */
const objectIdString = z.string().refine(
  (val) => isValidObjectId(val),
  'Invalid product ID format'
);

/**
 * Schema for product slider curation: a list of product IDs (up to 14)
 * to be displayed in a slider on the homepage.
 */
export const productSliderSchema = z.object({
  productIds: z
    .array(objectIdString)
    .min(0, 'No products selected')
    .max(14, 'Maximum 14 products allowed'),
});

export type ProductSliderInput = z.infer<typeof productSliderSchema>;
