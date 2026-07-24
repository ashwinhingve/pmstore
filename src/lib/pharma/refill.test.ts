import { describe, it, expect } from 'vitest';
import { daysOfSupply, computeDueAt } from './refill';

describe('daysOfSupply', () => {
  it('is packSize * quantity for a one-a-day medicine', () => {
    expect(daysOfSupply(30, 1)).toBe(30);
    expect(daysOfSupply(15, 2)).toBe(30);
  });

  it('returns 0 for non-positive inputs (nothing to remind about)', () => {
    expect(daysOfSupply(0, 3)).toBe(0);
    expect(daysOfSupply(30, 0)).toBe(0);
    expect(daysOfSupply(-5, 2)).toBe(0);
  });
});

describe('computeDueAt', () => {
  const delivered = new Date('2026-01-01T00:00:00.000Z');

  it('schedules the reminder at 85% of the supply window by default', () => {
    // 30 days supply * 0.85 = 25.5 days -> 25 whole days after delivery.
    const due = computeDueAt(delivered, 30, 1);
    expect(due).not.toBeNull();
    expect(due!.toISOString()).toBe('2026-01-26T00:00:00.000Z');
  });

  it('scales with quantity', () => {
    // 15 * 2 = 30 days supply, same as above.
    const due = computeDueAt(delivered, 15, 2);
    expect(due!.toISOString()).toBe('2026-01-26T00:00:00.000Z');
  });

  it('honours a custom consume fraction', () => {
    // 30 * 0.5 = 15 days.
    const due = computeDueAt(delivered, 30, 1, 0.5);
    expect(due!.toISOString()).toBe('2026-01-16T00:00:00.000Z');
  });

  it('returns null when there is no supply to base a reminder on', () => {
    expect(computeDueAt(delivered, 0, 1)).toBeNull();
    expect(computeDueAt(delivered, 30, 0)).toBeNull();
  });

  it('never schedules in the past — clamps tiny supplies to at least 1 day out', () => {
    const due = computeDueAt(delivered, 1, 1); // 0.85 days -> floors to 0
    expect(due!.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });
});
