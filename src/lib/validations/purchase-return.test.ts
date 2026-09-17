import { describe, it, expect } from 'vitest';
import { purchaseReturnSchema } from './purchase-return';

const oid = 'a'.repeat(24);

const validItem = {
  productId: oid,
  productName: 'Dolo 650',
  quantity: 2,
  costPrice: 8,
  reason: 'damaged' as const,
};

describe('purchaseReturnSchema', () => {
  it('accepts a return with one line', () => {
    const parsed = purchaseReturnSchema.parse({ supplierId: oid, items: [validItem] });
    expect(parsed.items).toHaveLength(1);
  });

  it('requires at least one item', () => {
    expect(purchaseReturnSchema.safeParse({ supplierId: oid, items: [] }).success).toBe(false);
  });

  it('rejects an invalid return reason', () => {
    expect(
      purchaseReturnSchema.safeParse({ supplierId: oid, items: [{ ...validItem, reason: 'nope' }] }).success
    ).toBe(false);
  });
});
