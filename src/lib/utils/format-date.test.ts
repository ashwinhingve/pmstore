import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './format-date';

describe('formatDateTime', () => {
  it('renders the instant in IST regardless of the host timezone', () => {
    // 11:55 UTC is 17:25 IST (+5:30). The IST time must show, never the UTC one —
    // this is the guard against the hydration bug (server renders UTC, browser IST).
    const out = formatDateTime('2026-07-26T11:55:00Z').toLowerCase();
    expect(out).toContain('26 jul 2026');
    expect(out).toContain('05:25');
    expect(out).toContain('pm');
    expect(out).not.toContain('11:55');
  });

  it('accepts a Date, a number, and an ISO string identically', () => {
    const iso = '2026-07-26T11:55:00Z';
    expect(formatDateTime(new Date(iso))).toBe(formatDateTime(iso));
    expect(formatDateTime(Date.parse(iso))).toBe(formatDateTime(iso));
  });
});

describe('formatDate', () => {
  it('formats a date-only string in IST', () => {
    expect(formatDate('2026-07-26T11:55:00Z')).toContain('26 Jul 2026');
  });

  it('rolls to the next IST day past 18:30 UTC (the midnight-boundary case)', () => {
    // 20:00 UTC on Jul 26 is 01:30 IST on Jul 27. A formatter without a fixed
    // timezone would show Jul 26 on the server and Jul 27 in the browser — a
    // hydration mismatch on any date-only cell.
    const out = formatDate('2026-07-26T20:00:00Z');
    expect(out).toContain('27 Jul 2026');
    expect(out).not.toContain('26 Jul');
  });
});
