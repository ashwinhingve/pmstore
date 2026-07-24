/**
 * Stock + popularity mutation for a single order line.
 *
 * A paid order does two things to each product it contains: it removes the
 * purchased quantity from stock and it bumps `orderCount` (the Strip's
 * "most-popular" ranking reads `orderCount`, so a sale has to move it).
 *
 * This builds the `{ filter, update }` pair applied with `findOneAndUpdate`.
 * The filter carries the stock guard (`stock >= quantity`), so under a race the
 * update matches nothing and the caller can treat a null result as "sold out"
 * and abort — which is exactly how the payment callback's transaction works.
 * Kept pure so both the online-payment and COD paths share one definition.
 */

export interface StockDecrementItem {
  productId: unknown;
  variantId?: string | null;
  quantity: number;
}

export interface StockDecrement {
  filter: Record<string, unknown>;
  update: Record<string, unknown>;
}

export function buildStockDecrement(item: StockDecrementItem): StockDecrement {
  const qty = item.quantity;

  if (item.variantId) {
    return {
      filter: {
        _id: item.productId,
        variants: { $elemMatch: { id: item.variantId, stock: { $gte: qty } } },
      },
      update: {
        $inc: { 'variants.$.stock': -qty, stock: -qty, orderCount: qty },
      },
    };
  }

  return {
    filter: { _id: item.productId, stock: { $gte: qty } },
    update: { $inc: { stock: -qty, orderCount: qty } },
  };
}
