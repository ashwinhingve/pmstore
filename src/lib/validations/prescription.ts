import * as z from 'zod';

/**
 * Optional text fields that accompany a prescription upload. Values arrive as
 * multipart form-data strings, so empty strings collapse to undefined and the
 * "build my cart" flag is matched literally (z.coerce.boolean would treat the
 * string "false" as true).
 */
export const prescriptionMetaSchema = z.object({
  patientName: z
    .preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(120).optional()),
  doctorName: z
    .preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(120).optional()),
  issueDate: z
    .preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.date().optional()),
  buildCartRequested: z
    .preprocess((v) => v === 'true' || v === true, z.boolean())
    .optional()
    .default(false),
});

export type PrescriptionMeta = z.infer<typeof prescriptionMetaSchema>;
