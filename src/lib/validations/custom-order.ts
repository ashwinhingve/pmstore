import * as z from 'zod';

/**
 * Custom order (consumer medicine request). Public form → stored + emailed to
 * the shop. Only name, phone and the medicine(s) needed are required so anyone
 * can send a request quickly. Distinct from the B2B wholesale enquiry.
 */

const optionalText = (max: number) =>
  z.string().trim().max(max, `Keep this under ${max} characters`).optional().or(z.literal(''));

// A required consent: the box must be ticked (true) for the request to be valid.
// Enforced both client-side (form disables submit) and server-side (this schema).
const requiredConsent = z.boolean().refine((v) => v === true, 'Please accept to continue');

export const customOrderSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  medicines: z.string().trim().min(3, 'Tell us which medicine(s) you need').max(2000),
  quantity: optionalText(120),
  deliveryArea: optionalText(160),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code')
    .optional()
    .or(z.literal('')),
  hasPrescription: z.boolean().optional(),
  notes: optionalText(2000),
  // Required consents (client's "T&C Apply" note) — all three must be accepted.
  // Field names/order mirror src/lib/custom-order-consents.ts.
  agreeMonopolyNotice: requiredConsent,
  agreeMarketShortage: requiredConsent,
  agreeNearExpiry: requiredConsent,
  // Honeypot: real users never see or fill this. Bots do. Must stay empty.
  website: z.string().max(0).optional().or(z.literal('')),
});

export type CustomOrderInput = z.infer<typeof customOrderSchema>;

/**
 * Admin-only: the lifecycle a custom order moves through in the queue.
 * Mirrors the enum on the CustomOrder model.
 */
export const CUSTOM_ORDER_STATUSES = ['new', 'contacted', 'closed'] as const;

export const customOrderStatusSchema = z.object({
  status: z.enum(CUSTOM_ORDER_STATUSES),
});

export type CustomOrderStatus = (typeof CUSTOM_ORDER_STATUSES)[number];
