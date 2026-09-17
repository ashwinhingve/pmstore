import { describe, it, expect } from 'vitest';
import { computePurchase, computePurchaseReturn } from './purchase-math';

const oid = 'a'.repeat(24);

describe('computePurchase', () => {
  it('sums line totals, adds per-line GST and rounds to 2dp', () => {
    const { items, subtotal, taxAmount, total } = computePurchase([
      { productId: oid, productName: 'A', batchNumber: 'B1', quantity: 10, costPrice: 8.5, gstRate: 5, freeQuantity: 0 },
      { productId: oid, productName: 'B', batchNumber: 'B2', quantity: 3, costPrice: 12, gstRate: 12, freeQuantity: 2 },
    ]);
    expect(items[0].lineTotal).toBe(85); // 10 * 8.5
    expect(items[1].lineTotal).toBe(36); // 3 * 12
    expect(subtotal).toBe(121);
    expect(taxAmount).toBe(85 * 0.05 + 36 * 0.12); // 4.25 + 4.32 = 8.57
    expect(total).toBe(129.57);
  });

  it('keeps free goods out of the money and converts an expiry string to a Date', () => {
    const { items, subtotal } = computePurchase([
      { productId: oid, productName: 'A', batchNumber: 'B1', quantity: 5, costPrice: 10, freeQuantity: 5, expiryDate: '2027-05-01' },
    ]);
    expect(items[0].lineTotal).toBe(50); // free 5 not billed
    expect(subtotal).toBe(50);
    expect(items[0].expiryDate).toBeInstanceOf(Date);
  });
});

describe('computePurchaseReturn', () => {
  it('sums line totals with no separate tax', () => {
    const { subtotal, taxAmount, total } = computePurchaseReturn([
      { productId: oid, productName: 'A', quantity: 4, costPrice: 8, reason: 'damaged' },
    ]);
    expect(subtotal).toBe(32);
    expect(taxAmount).toBe(0);
    expect(total).toBe(32);
  });
});
