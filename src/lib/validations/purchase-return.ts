import * as z from 'zod';
import { objectId, optionalText } from './inventory-common';

/**
 * A purchase return to a supplier. Line totals are recomputed server-side from
 * quantity × costPrice (never trusted from the client). Only purchase returns
 * live here; customer returns are handled as a stock-in adjustment.
 */
export const purchaseReturnReasonEnum = z.enum([
  'expired',
  'near_expiry',
  'damaged',
  'wrong_item',
  'overstock',
  'other',
]);

export const purchaseReturnItemSchema = z.object({
  productId: objectId,
  productName: z.string().trim().min(1, 'Product name is required'),
  batchId: objectId.optional(),
  batchNumber: optionalText(80),
  quantity: z.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
  costPrice: z.number().min(0, 'Cost price must be 0 or more'),
  reason: purchaseReturnReasonEnum,
  note: optionalText(300),
});

export const purchaseReturnSchema = z.object({
  supplierId: objectId,
  purchaseId: objectId.optional(),
  purchaseNumber: optionalText(40),
  items: z.array(purchaseReturnItemSchema).min(1, 'Add at least one item to return'),
  notes: optionalText(1000),
});

export type PurchaseReturnFormData = z.infer<typeof purchaseReturnSchema>;
export type PurchaseReturnItemData = z.infer<typeof purchaseReturnItemSchema>;
