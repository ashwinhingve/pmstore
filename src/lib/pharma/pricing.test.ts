import { describe, it, expect } from 'vitest';
import { computeSellingPrice, discountFromPrices } from './pricing';

describe('computeSellingPrice', () => {
  it('applies a percentage discount to the MRP', () => {
    expect(computeSellingPrice(100, 20)).toBe(80);
    expect(computeSellingPrice(52, 0)).toBe(52);
    expect(computeSellingPrice(100, 100)).toBe(0);
  });

  it('rounds to paise', () => {
    expect(computeSellingPrice(99.99, 15)).toBe(84.99);
    expect(computeSellingPrice(33, 33)).toBe(22.11);
  });

  it('clamps a nonsensical discount into 0–100', () => {
    expect(computeSellingPrice(100, -10)).toBe(100);
    expect(computeSellingPrice(100, 250)).toBe(0);
  });

  it('treats a missing / non-positive MRP as zero', () => {
    expect(computeSellingPrice(0, 20)).toBe(0);
    expect(computeSellingPrice(NaN, 20)).toBe(0);
  });
});

describe('discountFromPrices', () => {
  it('recovers the discount implied by MRP and selling price', () => {
    expect(discountFromPrices(100, 80)).toBe(20);
    expect(discountFromPrices(200, 150)).toBe(25);
  });

  it('is 0 when there is no genuine discount', () => {
    expect(discountFromPrices(100, 100)).toBe(0);
    expect(discountFromPrices(100, 120)).toBe(0); // price above MRP → no discount
    expect(discountFromPrices(0, 80)).toBe(0);
  });
});
