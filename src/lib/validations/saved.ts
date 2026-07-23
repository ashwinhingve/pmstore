import * as z from 'zod';

/** Body for POST /api/saved. productId is a Mongo ObjectId string. */
export const saveMedicineSchema = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid product'),
});

export type SaveMedicineInput = z.infer<typeof saveMedicineSchema>;
