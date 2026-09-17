import { describe, it, expect } from 'vitest';
import { formatExpiry, expiryStatus, EXPIRY_SOON_DAYS } from './expiry';

describe('formatExpiry', () => {
  it('renders month + year (the pack convention)', () => {
    expect(formatExpiry('2027-05-01')).toBe('May 2027');
  });

  it('accepts a Date as well as a string', () => {
    expect(formatExpiry(new Date('2026-12-15'))).toBe('Dec 2026');
  });
});

describe('expiryStatus', () => {
  const now = new Date('2026-01-01T12:00:00Z');

  it('is "ok" for a date well beyond the soon window', () => {
    expect(expiryStatus('2027-01-01', now)).toBe('ok');
  });

  it('is "expiring" for a date within the soon window', () => {
    expect(expiryStatus('2026-02-15', now)).toBe('expiring'); // ~45 days out
  });

  it('is "expiring" on the exact soon-window boundary', () => {
    const boundary = new Date(now);
    boundary.setUTCDate(boundary.getUTCDate() + EXPIRY_SOON_DAYS);
    expect(expiryStatus(boundary, now)).toBe('expiring');
  });

  it('is "ok" one day past the soon-window boundary', () => {
    const justPast = new Date(now);
    justPast.setUTCDate(justPast.getUTCDate() + EXPIRY_SOON_DAYS + 1);
    expect(expiryStatus(justPast, now)).toBe('ok');
  });

  it('is "expiring" when it expires today (day 0)', () => {
    expect(expiryStatus('2026-01-01', now)).toBe('expiring');
  });

  it('is "expired" once the date has passed', () => {
    expect(expiryStatus('2025-12-31', now)).toBe('expired');
  });
});
