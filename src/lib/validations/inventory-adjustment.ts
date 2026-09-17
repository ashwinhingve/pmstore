import * as z from 'zod';
import { objectId, optionalDateString, optionalText } from './inventory-common';

/**
 * A manual stock adjustment. `in` (opening stock, restock, customer return) adds
 * physical stock and so must name the batch it belongs to; `out` (counter sale,
 * breakage, wastage, expiry write-off) needs no batch — the service draws it down
 * FEFO. `productName` is snapshotted server-side, not accepted here.
 */
export const adjustmentReasonEnum = z.enum([
  'opening',
  'recount',
  'counter_sale',
  'damage',
  'wastage',
  'expiry_writeoff',
  'customer_return',
  'found',
  'other',
]);

export const adjustmentSchema = z
  .object({
    productId: objectId,
    direction: z.enum(['in', 'out']),
    quantity: z.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
    reason: adjustmentReasonEnum,
    // Optional target batch for an `out` (e.g. writing off one expired lot).
    batchId: objectId.optional(),
    batchNumber: optionalText(80),
    expiryDate: optionalDateString,
    costPrice: z.number().min(0).optional(),
    mrp: z.number().min(0).optional(),
    note: optionalText(500),
  })
  .superRefine((d, ctx) => {
    // Incoming stock always belongs to a batch — require one so it lands in the ledger.
    if (d.direction === 'in' && (!d.batchNumber || d.batchNumber.trim() === '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['batchNumber'],
        message: 'Batch number is required when adding stock.',
      });
    }
  });

export type AdjustmentFormData = z.infer<typeof adjustmentSchema>;
