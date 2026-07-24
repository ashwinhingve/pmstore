/**
 * The savings counter — "you've saved ₹X buying generics/discounted brands
 * with us this year". A retention hook, so it must never overstate: if we don't
 * know a line's MRP we count zero saving for it rather than guess.
 *
 * Pure and DB-free. The account route loads the customer's delivered order
 * lines, joins each to its Product for the current MRP (OrderItem doesn't
 * snapshot MRP in v1 — Week-4-owned schema), and passes plain objects here.
 * Because MRP comes from today's catalogue, the figure is approximate until the
 * order snapshot carries MRP; that's acceptable for a feel-good counter.
 */

export interface SavingLine {
  /** Maximum retail price. Undefined when unknown — yields zero saving. */
  mrp?: number;
  /** What the customer actually paid per unit. */
  price: number;
  quantity: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Saving on one line: never negative, zero when MRP is unknown. */
export function lineSaving({ mrp, price, quantity }: SavingLine): number {
  if (mrp === undefined || mrp <= price) return 0;
  return round2((mrp - price) * quantity);
}

/** Total saving across a set of purchased lines. */
export function sumSavings(lines: SavingLine[]): number {
  return round2(lines.reduce((total, line) => total + lineSaving(line), 0));
}
