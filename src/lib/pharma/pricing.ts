/**
 * Pharmacy pricing math. The admin enters only MRP + discount%; the selling
 * price is always derived from those two so there is never a hand-entered
 * selling price that can drift out of step (see the pricing tab in
 * src/components/admin/products/ProductForm.tsx). Money is rupees rounded to two
 * decimals at write time (root CLAUDE.md).
 */

/** Selling price = MRP − discount%, rounded to paise. */
export function computeSellingPrice(mrp: number, discountPct: number): number {
  const safeMrp = Number.isFinite(mrp) && mrp > 0 ? mrp : 0;
  const safePct = Math.min(100, Math.max(0, Number.isFinite(discountPct) ? discountPct : 0));
  return Math.round(safeMrp * (1 - safePct / 100) * 100) / 100;
}

/** The discount% implied by an MRP and a selling price (0 when there is none). */
export function discountFromPrices(mrp: number, price: number): number {
  if (!(mrp > 0) || !(price > 0) || price >= mrp) return 0;
  return Math.round((1 - price / mrp) * 100);
}
