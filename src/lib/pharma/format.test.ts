import { describe, it, expect } from 'vitest';
import {
  formatINR,
  perUnitLabel,
  packUnitShort,
  scheduleLabel,
  isRxSchedule,
  discountPercent,
  normalizeUnit,
  pluralizeUnit,
  formatPack,
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

describe('normalizeUnit', () => {
  it('maps legacy "gm" to "g" and leaves other units untouched', () => {
    expect(normalizeUnit('gm')).toBe('g');
    expect(normalizeUnit('GM')).toBe('g');
    expect(normalizeUnit('tablet')).toBe('tablet');
    expect(normalizeUnit(' ml ')).toBe('ml');
  });
});

describe('pluralizeUnit', () => {
  it('pluralises countable units when count is not 1', () => {
    expect(pluralizeUnit('tablet', 15)).toBe('tablets');
    expect(pluralizeUnit('bottle', 2)).toBe('bottles');
    expect(pluralizeUnit('strip', 3)).toBe('strips');
  });
  it('keeps countable units singular for exactly one', () => {
    expect(pluralizeUnit('tablet', 1)).toBe('tablet');
    expect(pluralizeUnit('bottle', 1)).toBe('bottle');
  });
  it('never pluralises measure units', () => {
    expect(pluralizeUnit('ml', 100)).toBe('ml');
    expect(pluralizeUnit('g', 500)).toBe('g');
    expect(pluralizeUnit('gm', 500)).toBe('g');
  });
});

describe('formatPack', () => {
  it('joins pack size with its correctly-spelled unit', () => {
    expect(formatPack(15, 'tablet')).toBe('15 tablets');
    expect(formatPack(1, 'tablet')).toBe('1 tablet');
    expect(formatPack(100, 'ml')).toBe('100 ml');
    expect(formatPack(2, 'bottle')).toBe('2 bottles');
  });
});
