import { describe, it, expect } from 'vitest';
import { diffReorder, type ReorderLine, type ProductSnapshot } from './reorder';

function product(over: Partial<ProductSnapshot> & { _id: string }): ProductSnapshot {
  return {
    name: 'Dolo 650',
    slug: 'dolo-650',
    price: 30,
    stock: 100,
    isActive: true,
    isDiscontinued: false,
    prescriptionRequired: false,
    ...over,
  };
}

function line(over: Partial<ReorderLine> & { productId: string }): ReorderLine {
  return { productName: 'Dolo 650', quantity: 2, priceAtPurchase: 30, ...over };
}

describe('diffReorder', () => {
  it('adds an in-stock, unchanged item at its original quantity', () => {
    const { added, skipped } = diffReorder(
      [line({ productId: 'p1' })],
      { p1: product({ _id: 'p1' }) }
    );
    expect(skipped).toEqual([]);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ productId: 'p1', quantity: 2, price: 30, priceChanged: false });
  });

  it('skips a product that is missing, inactive or discontinued as unavailable', () => {
    const res = diffReorder(
      [line({ productId: 'gone' }), line({ productId: 'off' }), line({ productId: 'disc' })],
      {
        off: product({ _id: 'off', isActive: false }),
        disc: product({ _id: 'disc', isDiscontinued: true }),
      }
    );
    expect(res.added).toEqual([]);
    expect(res.skipped.map((s) => s.reason)).toEqual(['unavailable', 'unavailable', 'unavailable']);
  });

  it('skips an out-of-stock item', () => {
    const { added, skipped } = diffReorder(
      [line({ productId: 'p1' })],
      { p1: product({ _id: 'p1', stock: 0 }) }
    );
    expect(added).toEqual([]);
    expect(skipped[0]).toMatchObject({ productId: 'p1', reason: 'out_of_stock' });
  });

  it('skips a prescription-required item — Rx cannot be silently re-added to a cart', () => {
    const { added, skipped } = diffReorder(
      [line({ productId: 'rx' })],
      { rx: product({ _id: 'rx', prescriptionRequired: true }) }
    );
    expect(added).toEqual([]);
    expect(skipped[0]).toMatchObject({ productId: 'rx', reason: 'prescription_required' });
  });

  it('flags a price change but still adds the item', () => {
    const { added } = diffReorder(
      [line({ productId: 'p1', priceAtPurchase: 28 })],
      { p1: product({ _id: 'p1', price: 34 }) }
    );
    expect(added[0]).toMatchObject({ price: 34, previousPrice: 28, priceChanged: true });
  });

  it('caps quantity to available stock and flags the adjustment', () => {
    const { added } = diffReorder(
      [line({ productId: 'p1', quantity: 10 })],
      { p1: product({ _id: 'p1', stock: 3 }) }
    );
    expect(added[0]).toMatchObject({ quantity: 3, quantityAdjusted: true });
  });

  it('handles a mixed order in one pass', () => {
    const res = diffReorder(
      [
        line({ productId: 'ok' }),
        line({ productId: 'oos' }),
        line({ productId: 'rx' }),
      ],
      {
        ok: product({ _id: 'ok' }),
        oos: product({ _id: 'oos', stock: 0 }),
        rx: product({ _id: 'rx', prescriptionRequired: true }),
      }
    );
    expect(res.added).toHaveLength(1);
    expect(res.skipped).toHaveLength(2);
  });
});
