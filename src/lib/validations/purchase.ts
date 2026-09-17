import * as z from 'zod';
import { objectId, optionalDateString, optionalText, attachmentSchema } from './inventory-common';

/**
 * A purchase (goods-receipt + supplier invoice). Money is NEVER trusted from the
 * client (API CLAUDE.md): the route recomputes lineTotal, subtotal, taxAmount and
 * total from quantity/costPrice/gstRate here — the schema only accepts the inputs.
 */

const gstRate = z
  .number()
  .refine((v) => [0, 5, 12, 18, 28].includes(v), { message: 'GST rate must be 0, 5, 12, 18, or 28' })
  .optional();

export const purchaseItemSchema = z.object({
  productId: objectId,
  productName: z.string().trim().min(1, 'Product name is required'),
  batchNumber: z.string().trim().min(1, 'Batch number is required'),
  expiryDate: optionalDateString,
  quantity: z.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
  freeQuantity: z.number().int().min(0).default(0),
  costPrice: z.number().min(0, 'Cost price must be 0 or more'),
  mrp: z.number().min(0).optional(),
  gstRate,
});

export const purchaseSchema = z.object({
  supplierId: objectId,
  invoiceNumber: optionalText(60),
  invoiceDate: optionalDateString,
  status: z.enum(['draft', 'ordered', 'received']).default('draft'),
  items: z.array(purchaseItemSchema).min(1, 'Add at least one item'),
  paymentStatus: z.enum(['unpaid', 'partial', 'paid']).default('unpaid'),
  amountPaid: z.number().min(0).default(0),
  notes: optionalText(1000),
  attachments: z.array(attachmentSchema).default([]),
});

// Updating a draft: same shape, all optional; receiving is a separate action.
export const purchaseUpdateSchema = purchaseSchema.partial();

export type PurchaseFormData = z.infer<typeof purchaseSchema>;
export type PurchaseItemData = z.infer<typeof purchaseItemSchema>;
