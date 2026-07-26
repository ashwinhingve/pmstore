import * as z from 'zod';

/**
 * Wholesale enquiry (lead capture). Public form → stored + emailed to the shop.
 * Only businessName / contactPerson / phone / email are required so a busy
 * pharmacist can send an enquiry quickly; everything else helps us quote.
 */

export const MONTHLY_VOLUME_OPTIONS = [
  { value: '', label: 'Select a range (optional)' },
  { value: 'under-50k', label: 'Under ₹50,000' },
  { value: '50k-1L', label: '₹50,000 – ₹1 lakh' },
  { value: '1L-5L', label: '₹1 lakh – ₹5 lakh' },
  { value: '5L-plus', label: 'Over ₹5 lakh' },
] as const;

const MONTHLY_VOLUME_LABELS: Record<string, string> = Object.fromEntries(
  MONTHLY_VOLUME_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);

export function monthlyVolumeLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return MONTHLY_VOLUME_LABELS[value] ?? value;
}

// India GSTIN: 2-digit state, 5 letters, 4 digits, 1 letter, 1 alnum, 'Z', 1 alnum
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Optional free-text field: allow empty string or a trimmed value up to `max`.
const optionalText = (max: number) =>
  z.string().trim().max(max, `Keep this under ${max} characters`).optional().or(z.literal(''));

export const wholesaleEnquirySchema = z.object({
  businessName: z.string().trim().min(2, 'Enter your business name').max(160),
  contactPerson: z.string().trim().min(2, 'Enter a contact name').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  gstNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN, 'Enter a valid 15-character GSTIN')
    .optional()
    .or(z.literal('')),
  drugLicenseNumber: optionalText(80),
  addressLine: optionalText(300),
  city: optionalText(80),
  state: optionalText(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code')
    .optional()
    .or(z.literal('')),
  productRequirements: optionalText(2000),
  quantity: optionalText(120),
  preferredBrands: optionalText(500),
  monthlyVolume: z
    .enum(['under-50k', '50k-1L', '1L-5L', '5L-plus'])
    .optional()
    .or(z.literal('')),
  notes: optionalText(2000),
  // Honeypot: real users never see or fill this. Bots do. Must stay empty.
  website: z.string().max(0).optional().or(z.literal('')),
});

export type WholesaleEnquiryInput = z.infer<typeof wholesaleEnquirySchema>;

/**
 * Admin-only: the lifecycle an enquiry moves through in the bulk-orders queue.
 * `new` → just arrived, `contacted` → the shop has reached out, `closed` → done
 * (quoted, converted or declined). Mirrors the enum on the WholesaleEnquiry model.
 */
export const WHOLESALE_STATUSES = ['new', 'contacted', 'closed'] as const;

export const wholesaleStatusSchema = z.object({
  status: z.enum(WHOLESALE_STATUSES),
});

export type WholesaleStatus = (typeof WHOLESALE_STATUSES)[number];
