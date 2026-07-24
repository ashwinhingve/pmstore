import { describe, it, expect } from 'vitest';
import { lineSaving, sumSavings, type SavingLine } from './savings';

describe('lineSaving', () => {
  it('is (mrp - price) * quantity when the customer paid below MRP', () => {
    expect(lineSaving({ mrp: 50, price: 30, quantity: 2 })).toBe(40);
  });

  it('is zero when price equals or exceeds MRP', () => {
    expect(lineSaving({ mrp: 30, price: 30, quantity: 5 })).toBe(0);
    expect(lineSaving({ mrp: 25, price: 30, quantity: 5 })).toBe(0);
  });

  it('is zero when MRP is unknown (never invents a saving)', () => {
    expect(lineSaving({ price: 30, quantity: 5 })).toBe(0);
    expect(lineSaving({ mrp: undefined, price: 30, quantity: 5 })).toBe(0);
  });

  it('rounds to paise', () => {
    expect(lineSaving({ mrp: 33.335, price: 30, quantity: 1 })).toBe(3.34);
  });
});

describe('sumSavings', () => {
  it('totals savings across many lines', () => {
    const lines: SavingLine[] = [
      { mrp: 50, price: 30, quantity: 2 }, // 40
      { mrp: 100, price: 80, quantity: 1 }, // 20
      { price: 15, quantity: 3 }, // 0 (no mrp)
    ];
    expect(sumSavings(lines)).toBe(60);
  });

  it('is zero for an empty history', () => {
    expect(sumSavings([])).toBe(0);
  });
});
