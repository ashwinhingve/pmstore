import { describe, it, expect } from 'vitest';
import { extractGST, calculateOrderGST, gstLabel } from './gst';

/**
 * Tier-1 tests for GST (docs/07-TESTING.md). Prices in the DB are GST-inclusive
 * (MRP); tax is extracted, never added. Seller is in Madhya Pradesh, so a sale
 * to MP splits into CGST+SGST and everywhere else is IGST. Money is rounded to
 * the paisa. Getting this wrong on invoices is a compliance problem.
 */

describe('extractGST', () => {
  it('returns the whole price as base when the rate is 0', () => {
    expect(extractGST(100, 0)).toEqual({ base: 100, gst: 0 });
  });

  it('extracts each slab from a clean inclusive price', () => {
    expect(extractGST(105, 5)).toEqual({ base: 100, gst: 5 });
    expect(extractGST(112, 12)).toEqual({ base: 100, gst: 12 });
    expect(extractGST(118, 18)).toEqual({ base: 100, gst: 18 });
    expect(extractGST(128, 28)).toEqual({ base: 100, gst: 28 });
  });

  it('rounds base and gst to the paisa and they still sum to the price', () => {
    const { base, gst } = extractGST(100, 5); // 100/1.05 = 95.2380…
    expect(base).toBe(95.24);
    expect(gst).toBe(4.76);
    expect(Math.round((base + gst) * 100) / 100).toBe(100);
  });
});

describe('calculateOrderGST', () => {
  const items = [{ inclusivePrice: 105, quantity: 2, gstRate: 5 }]; // base 200, gst 10

  it('splits into CGST + SGST for an intra-state (MP) order', () => {
    const b = calculateOrderGST(items, 'Madhya Pradesh');
    expect(b.isIntraState).toBe(true);
    expect(b.taxableValue).toBe(200);
    expect(b.taxAmount).toBe(10);
    expect(b.cgst).toBe(5);
    expect(b.sgst).toBe(5);
    expect(b.igst).toBe(0);
    expect(b.cgst + b.sgst).toBe(b.taxAmount);
  });

  it('matches the seller state case-insensitively', () => {
    expect(calculateOrderGST(items, 'madhya pradesh').isIntraState).toBe(true);
    expect(calculateOrderGST(items, '  MADHYA PRADESH  ').isIntraState).toBe(true);
  });

  it('charges IGST for an inter-state order', () => {
    const b = calculateOrderGST(items, 'Maharashtra');
    expect(b.isIntraState).toBe(false);
    expect(b.igst).toBe(10);
    expect(b.cgst).toBe(0);
    expect(b.sgst).toBe(0);
    expect(b.taxAmount).toBe(10);
  });

  it('sums mixed slabs and quantities across the order', () => {
    const mixed = [
      { inclusivePrice: 105, quantity: 1, gstRate: 5 }, // gst 5, base 100
      { inclusivePrice: 118, quantity: 2, gstRate: 18 }, // gst 18*2=36, base 200
    ];
    const b = calculateOrderGST(mixed, 'Maharashtra');
    expect(b.taxAmount).toBe(41);
    expect(b.taxableValue).toBe(300);
    expect(b.igst).toBe(41);
  });
});

describe('gstLabel', () => {
  it('labels a zero rate as exempt', () => {
    expect(gstLabel(0, true)).toBe('GST Exempt');
  });
  it('splits the rate for an intra-state sale', () => {
    expect(gstLabel(5, true)).toBe('CGST 2.5% + SGST 2.5%');
  });
  it('shows the full rate as IGST for an inter-state sale', () => {
    expect(gstLabel(5, false)).toBe('IGST 5%');
  });
});
