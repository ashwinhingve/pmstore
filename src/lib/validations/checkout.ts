import * as z from 'zod';

/**
 * Address validation schema
 */
export const addressSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit mobile number starting with 6-9'),
  addressLine1: z.string().min(5, 'Address is required (minimum 5 characters)'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().regex(/^\d{6}$/, 'Invalid 6-digit PIN code'),
  country: z.string().default('India'),
  type: z.enum(['shipping', 'billing', 'both']).default('shipping'),
  isDefault: z.boolean().default(false),
});

/**
 * Checkout validation schema
 */
export const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
  })).min(1, 'Cart cannot be empty'),
  shippingAddressId: z.string().min(1, 'Shipping address is required'),
  billingAddressId: z.string().optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

/**
 * Shipping calculation validation schema
 */
export const shippingCalculationSchema = z.object({
  cartTotal: z.number().min(0, 'Cart total must be positive'),
  cartWeight: z.number().min(0, 'Cart weight must be positive'),
  postalCode: z.string().regex(/^\d{6}$/, 'Invalid PIN code'),
});

export type AddressFormData = z.infer<typeof addressSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
export type ShippingCalculationData = z.infer<typeof shippingCalculationSchema>;
