import * as z from 'zod';

/**
 * Small shared Zod pieces for the inventory validations, so a 24-hex ObjectId and
 * a date-only string are validated the same way across suppliers, purchases,
 * adjustments and returns. Kept minimal — mirrors how product.ts inlines its rules.
 */

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid id is required');

/** A date-only "YYYY-MM-DD" string (Mongoose casts it to a Date on save). */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date (YYYY-MM-DD)');

/** Optional date string that also tolerates the empty string a form sends. */
export const optionalDateString = dateString.optional().or(z.literal(''));

/** An optional trimmed string that tolerates the empty string a form sends. */
export const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(''));

/** Cloudinary attachment (supplier invoice scan — not health data). */
export const attachmentSchema = z.object({
  url: z.string().min(1, 'Attachment URL is required'),
  publicId: z.string().min(1, 'Attachment public ID is required'),
  name: z.string().default(''),
});
