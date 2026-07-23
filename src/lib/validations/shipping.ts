import * as z from 'zod';

/**
 * Delhivery webhook payload validation schema
 */
export const delhiveryWebhookSchema = z.object({
  waybill: z.string().min(10, 'Waybill must be at least 10 characters').max(50, 'Waybill too long'),
  status: z.string().min(1, 'Status is required').max(100, 'Status too long'),
  location: z.string().max(200, 'Location too long').optional(),
  timestamp: z.string().datetime().optional().or(z.string().optional()),
  scan_type: z.string().max(100, 'Scan type too long').optional(),
  instructions: z.string().max(500, 'Instructions too long').optional(),
  remarks: z.string().max(500, 'Remarks too long').optional(),
});

/**
 * Shipment creation request validation
 */
export const createShipmentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  isAutomatic: z.boolean().optional(),
});

/**
 * Tracking request validation
 */
export const trackShipmentSchema = z.object({
  waybill: z.string().min(10, 'Waybill must be at least 10 characters').max(50, 'Waybill too long'),
});

/**
 * Serviceability check validation
 */
export const checkServiceabilitySchema = z.object({
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits')
    .min(6)
    .max(6),
});

/**
 * Valid Delhivery shipment statuses
 */
export const VALID_SHIPMENT_STATUSES = [
  'Pending',
  'Manifested',
  'Dispatched',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'RTO',
  'RTO Delivered',
  'Cancelled',
  'Lost',
  'Damaged',
] as const;

/**
 * Validate shipment status
 */
export function isValidShipmentStatus(status: string): boolean {
  return VALID_SHIPMENT_STATUSES.includes(status as any);
}

/**
 * Sanitize and validate shipping address
 */
export const shippingAddressSchema = z.object({
  fullName: z.string().min(2, 'Name too short').max(100, 'Name too long'),
  phoneNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
    .min(10)
    .max(10),
  addressLine1: z.string().min(5, 'Address too short').max(200, 'Address too long'),
  addressLine2: z.string().max(200, 'Address too long').optional(),
  city: z.string().min(2, 'City name too short').max(100, 'City name too long'),
  state: z.string().min(2, 'State name too short').max(100, 'State name too long'),
  postalCode: z.string().regex(/^\d{6}$/, 'Invalid PIN code').min(6).max(6),
  country: z.string().default('India'),
  landmark: z.string().max(200, 'Landmark too long').optional(),
});

export type DelhiveryWebhookPayload = z.infer<typeof delhiveryWebhookSchema>;
export type CreateShipmentRequest = z.infer<typeof createShipmentSchema>;
export type TrackShipmentRequest = z.infer<typeof trackShipmentSchema>;
export type CheckServiceabilityRequest = z.infer<typeof checkServiceabilitySchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
