import { describe, it, expect } from 'vitest';
import {
  formatINR,
  perUnitLabel,
  packUnitShort,
  scheduleLabel,
  isRxSchedule,
  discountPercent,
} from './format';

describe('formatINR', () => {
  it('formats rupees with two decimals and the rupee sign', () => {
    expect(formatINR(30.5)).toBe('₹30.50');
    expect(formatINR(2)).toBe('₹2.00');
    expect(formatINR(1.9)).toBe('₹1.90');
  });
});

describe('packUnitShort', () => {
  it('abbreviates common pack units', () => {
    expect(packUnitShort('tablet')).toBe('tab');
    expect(packUnitShort('capsule')).toBe('cap');
    expect(packUnitShort('ml')).toBe('ml');
  });
  it('falls back to the given unit when unknown', () => {
    expect(packUnitShort('sachet')).toBe('sachet');
  });
});

describe('perUnitLabel', () => {
  it('renders the headline per-unit price', () => {
    expect(perUnitLabel(2.03, 'tablet')).toBe('₹2.03/tab');
    expect(perUnitLabel(1.9, 'ml')).toBe('₹1.90/ml');
  });
});

describe('scheduleLabel / isRxSchedule', () => {
  it('labels prescription schedules and nothing else', () => {
    expect(scheduleLabel('H')).toBe('Schedule H');
    expect(scheduleLabel('H1')).toBe('Schedule H1');
    expect(scheduleLabel('X')).toBe('Schedule X');
    expect(scheduleLabel('OTC')).toBeNull();
    expect(scheduleLabel('G')).toBeNull();
  });
  it('flags only H/H1/X as prescription-required schedules', () => {
    expect(isRxSchedule('H')).toBe(true);
    expect(isRxSchedule('H1')).toBe(true);
    expect(isRxSchedule('X')).toBe(true);
    expect(isRxSchedule('OTC')).toBe(false);
    expect(isRxSchedule('G')).toBe(false);
  });
});

describe('discountPercent', () => {
  it('computes a rounded percent off the MRP', () => {
    expect(discountPercent(36, 30.5)).toBe(15);
  });
  it('returns 0 when there is no valid saving', () => {
    expect(discountPercent(undefined, 30)).toBe(0);
    expect(discountPercent(20, 25)).toBe(0);
    expect(discountPercent(0, 25)).toBe(0);
  });
});
