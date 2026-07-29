import { z } from 'zod';

/**
 * Address validation for the web `/api/addresses` route
 * (Indian 10-digit mobile, 6-digit PIN).
 */
const phoneNumber = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

const postalCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code');

export const createAddressSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(100),
  phoneNumber,
  addressLine1: z.string().trim().min(1, 'Address is required').max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  postalCode,
  country: z.string().trim().min(1).max(100).default('India'),
  type: z.enum(['shipping', 'billing', 'both']).default('shipping'),
  isDefault: z.boolean().optional(),
});

/** Update accepts any subset of the create fields. */
export const updateAddressSchema = createAddressSchema.partial();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
