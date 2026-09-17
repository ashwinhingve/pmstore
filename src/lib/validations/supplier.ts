import * as z from 'zod';
import { optionalText } from './inventory-common';

/**
 * A supplier (distributor we buy from). `nameLower` is derived in the model and
 * never accepted here. Optional contact/compliance fields tolerate the empty
 * string the admin form sends for a blank input.
 */
export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(160),
  gstin: optionalText(20),
  drugLicenseNo: optionalText(60),
  contactPerson: optionalText(120),
  phone: optionalText(20),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  address: optionalText(500),
  paymentTerms: optionalText(120),
  notes: optionalText(1000),
  isActive: z.boolean().default(true),
});

export const supplierUpdateSchema = supplierSchema.partial();

export type SupplierFormData = z.infer<typeof supplierSchema>;
