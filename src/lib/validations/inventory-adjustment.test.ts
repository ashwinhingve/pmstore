import { describe, it, expect } from 'vitest';
import { adjustmentSchema } from './inventory-adjustment';

const oid = 'a'.repeat(24);

describe('adjustmentSchema', () => {
  it('accepts an out adjustment without a batch (drawn down FEFO)', () => {
    const parsed = adjustmentSchema.parse({
      productId: oid, direction: 'out', quantity: 3, reason: 'counter_sale',
    });
    expect(parsed.direction).toBe('out');
  });

  it('requires a batch number on an in adjustment', () => {
    const res = adjustmentSchema.safeParse({
      productId: oid, direction: 'in', quantity: 5, reason: 'opening',
    });
    expect(res.success).toBe(false);
  });

  it('accepts an in adjustment that names a batch', () => {
    const res = adjustmentSchema.safeParse({
      productId: oid, direction: 'in', quantity: 5, reason: 'opening',
      batchNumber: 'OPEN1', expiryDate: '2027-09-01', costPrice: 7,
    });
    expect(res.success).toBe(true);
  });

  it('rejects an unknown reason and a zero quantity', () => {
    expect(adjustmentSchema.safeParse({ productId: oid, direction: 'out', quantity: 1, reason: 'nope' }).success).toBe(false);
    expect(adjustmentSchema.safeParse({ productId: oid, direction: 'out', quantity: 0, reason: 'wastage' }).success).toBe(false);
  });
});
