import { describe, it, expect } from 'vitest';
import { buildStockDecrement } from './stock';

/**
 * A paid order removes stock and bumps orderCount (the Strip's "most-popular"
 * ranking reads orderCount). The stock guard lives in the filter so a race
 * matches nothing and the caller can abort.
 */

describe('buildStockDecrement', () => {
  it('decrements stock and bumps orderCount for a simple product', () => {
    expect(buildStockDecrement({ productId: 'p1', quantity: 3 })).toEqual({
      filter: { _id: 'p1', stock: { $gte: 3 } },
      update: { $inc: { stock: -3, orderCount: 3 } },
    });
  });

  it('decrements the variant and root stock for a variant line', () => {
    expect(buildStockDecrement({ productId: 'p1', variantId: 'v1', quantity: 2 })).toEqual({
      filter: {
        _id: 'p1',
        variants: { $elemMatch: { id: 'v1', stock: { $gte: 2 } } },
      },
      update: { $inc: { 'variants.$.stock': -2, stock: -2, orderCount: 2 } },
    });
  });

  it('treats a null variantId as a simple product', () => {
    const { filter } = buildStockDecrement({ productId: 'p1', variantId: null, quantity: 1 });
    expect(filter).toEqual({ _id: 'p1', stock: { $gte: 1 } });
  });
});
