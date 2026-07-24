/**
 * Refill-reminder timing.
 *
 * Pure and DB-free so it's unit-testable without a live database or a clock.
 * Given when an order was delivered and how much medicine it contained, work
 * out when the customer is likely to be running low, so we can nudge them to
 * reorder a few days *before* they run out rather than after.
 *
 * The model is deliberately simple: assume one unit (tablet/ml-dose) per day.
 * That over-estimates for twice-daily meds and under-estimates for as-needed
 * ones, but it's a nudge, not a prescription — the customer decides. A more
 * accurate model would need per-product dosing data we don't collect in v1.
 */

const DAY_MS = 1000 * 60 * 60 * 24;

/** Default: remind once 85% of the estimated supply has been consumed. */
const DEFAULT_CONSUME_FRACTION = 0.85;

/** Total days a delivery lasts at one unit/day. Zero for invalid inputs. */
export function daysOfSupply(packSize: number, quantity: number): number {
  if (packSize <= 0 || quantity <= 0) return 0;
  return packSize * quantity;
}

/**
 * When to fire the refill reminder, or null if there's nothing to base one on
 * (missing pack size / quantity). Clamped to at least one day after delivery so
 * a reminder is never scheduled in the past for tiny supplies.
 */
export function computeDueAt(
  deliveredAt: Date,
  packSize: number,
  quantity: number,
  consumeFraction: number = DEFAULT_CONSUME_FRACTION
): Date | null {
  const supply = daysOfSupply(packSize, quantity);
  if (supply <= 0) return null;

  const offsetDays = Math.max(1, Math.floor(supply * consumeFraction));
  return new Date(deliveredAt.getTime() + offsetDays * DAY_MS);
}
