import * as z from 'zod';

/**
 * Public contact form. Kept lenient on phone (the UI sends a formatted value
 * like "+91 98765 43210") — the point of this schema is structural validation
 * and never trusting/logging the raw body, not rejecting valid phone formats.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  subject: z.string().trim().max(160).optional().or(z.literal('')),
  message: z.string().trim().min(1, 'Enter a message').max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;
