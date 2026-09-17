/**
 * Product expiry — formatting + status. Pure, no DB, no React.
 *
 * Medicine packs print expiry as month + year, so that's how we show it. The
 * formatter is pinned to IST (like src/lib/utils/format-date.ts) so server and
 * client render the same text and React hydration doesn't complain.
 *
 * `expiryStatus` compares dates only (not instants), so "expired" flips the day
 * after the printed expiry, everywhere, regardless of the viewer's clock time.
 */

const IST = 'Asia/Kolkata';

const expiryFmt = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: 'numeric',
  timeZone: IST,
});

/** "May 2027" — month + year, IST. */
export function formatExpiry(input: string | number | Date): string {
  return expiryFmt.format(new Date(input));
}

/** Stock is "expiring" when it falls due within this many days. */
export const EXPIRY_SOON_DAYS = 90;

export type ExpiryStatus = 'ok' | 'expiring' | 'expired';

/** Days from `input` to `now`, counted on the calendar date (IST), not the clock. */
function daysUntil(input: string | number | Date, now: Date): number {
  // Compare at UTC midnight of each calendar date so partial days don't skew it.
  const target = new Date(input);
  const a = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((a - b) / 86_400_000);
}

/**
 * 'expired' once the date has passed, 'expiring' within EXPIRY_SOON_DAYS, else 'ok'.
 * `now` is injectable for testing.
 */
export function expiryStatus(input: string | number | Date, now: Date = new Date()): ExpiryStatus {
  const days = daysUntil(input, now);
  if (days < 0) return 'expired';
  if (days <= EXPIRY_SOON_DAYS) return 'expiring';
  return 'ok';
}
