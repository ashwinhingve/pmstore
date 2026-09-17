import type { PurchaseItemData } from '@/lib/validations/purchase';
import type { PurchaseReturnItemData } from '@/lib/validations/purchase-return';

/**
 * Server-side money math for purchases and returns. The client never sends
 * totals (API CLAUDE.md — never trust client prices); the route rebuilds every
 * line total and the document totals here from quantity × cost, rounded to 2dp
 * at write time (root CLAUDE.md money rule). Free goods add stock but cost 0, so
 * they don't affect the money — only the quantity received.
 */

const round2 = (n: number): number => Math.round(n * 100) / 100;

function toDate(value?: string): Date | undefined {
  return value && value !== '' ? new Date(value) : undefined;
}

export function computePurchase(items: PurchaseItemData[]) {
  const built = items.map((it) => ({
    productId: it.productId,
    productName: it.productName,
    batchNumber: it.batchNumber,
    expiryDate: toDate(it.expiryDate),
    quantity: it.quantity,
    freeQuantity: it.freeQuantity ?? 0,
    costPrice: round2(it.costPrice),
    mrp: it.mrp != null ? round2(it.mrp) : undefined,
    gstRate: it.gstRate,
    lineTotal: round2(it.quantity * it.costPrice),
  }));

  const subtotal = round2(built.reduce((s, i) => s + i.lineTotal, 0));
  const taxAmount = round2(built.reduce((s, i) => s + i.lineTotal * ((i.gstRate ?? 0) / 100), 0));
  const total = round2(subtotal + taxAmount);

  return { items: built, subtotal, taxAmount, total };
}

export function computePurchaseReturn(items: PurchaseReturnItemData[]) {
  const built = items.map((it) => ({
    productId: it.productId,
    productName: it.productName,
    batchId: it.batchId,
    batchNumber: it.batchNumber || undefined,
    quantity: it.quantity,
    costPrice: round2(it.costPrice),
    reason: it.reason,
    note: it.note || undefined,
    lineTotal: round2(it.quantity * it.costPrice),
  }));

  const subtotal = round2(built.reduce((s, i) => s + i.lineTotal, 0));
  const total = subtotal; // returns carry no separate tax line at this scale

  return { items: built, subtotal, taxAmount: 0, total };
}
