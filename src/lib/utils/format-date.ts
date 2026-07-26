/**
 * Date/time formatters pinned to India Standard Time. Pure — no DB, no React.
 *
 * Why a fixed timeZone: formatting a date with hour/minute and NO timeZone uses
 * the runtime's local zone. On the server that's UTC (or the host's zone); in
 * the browser it's the visitor's zone (IST here). The two produce different text
 * for the same instant, which fails React hydration ("server rendered … didn't
 * match the client"). Pinning `Asia/Kolkata` makes SSR and the client agree.
 *
 * The store operates in India, so IST is the correct display zone for everyone.
 * These strings render in `--font-data` at the call site (the mono rule,
 * docs/03-DESIGN-SYSTEM.md); these helpers only produce the text.
 */

const IST = 'Asia/Kolkata';

const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: IST,
});

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: IST,
});

/** "26 Jul 2026, 05:25 pm" — date with time-of-day, IST. */
export function formatDateTime(input: string | number | Date): string {
  return dateTimeFmt.format(new Date(input));
}

/** "26 Jul 2026" — date only, IST. */
export function formatDate(input: string | number | Date): string {
  return dateFmt.format(new Date(input));
}
