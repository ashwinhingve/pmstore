import { describe, it, expect } from 'vitest';
import { purchaseSchema } from './purchase';

const oid = 'a'.repeat(24);

const validItem = {
  productId: oid,
  productName: 'Dolo 650',
  batchNumber: 'B100',
  quantity: 10,
  costPrice: 8,
};

describe('purchaseSchema', () => {
  it('accepts a purchase with one line and defaults status/payment', () => {
    const parsed = purchaseSchema.parse({ supplierId: oid, items: [validItem] });
    expect(parsed.status).toBe('draft');
    expect(parsed.paymentStatus).toBe('unpaid');
    expect(parsed.items[0].freeQuantity).toBe(0);
  });

  it('requires at least one item', () => {
    expect(purchaseSchema.safeParse({ supplierId: oid, items: [] }).success).toBe(false);
  });

  it('requires a batch number on every line', () => {
    const bad = { ...validItem, batchNumber: '' };
    expect(purchaseSchema.safeParse({ supplierId: oid, items: [bad] }).success).toBe(false);
  });

  it('rejects a non-integer or zero quantity', () => {
    expect(purchaseSchema.safeParse({ supplierId: oid, items: [{ ...validItem, quantity: 0 }] }).success).toBe(false);
    expect(purchaseSchema.safeParse({ supplierId: oid, items: [{ ...validItem, quantity: 1.5 }] }).success).toBe(false);
  });

  it('rejects an invalid supplier id', () => {
    expect(purchaseSchema.safeParse({ supplierId: 'nope', items: [validItem] }).success).toBe(false);
  });
});
