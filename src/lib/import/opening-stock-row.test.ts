import { describe, it, expect } from 'vitest';
import { parseOpeningStockRow, normalizeExpiry } from './opening-stock-row';

describe('normalizeExpiry', () => {
  it('accepts month+year and normalises to the 1st', () => {
    expect(normalizeExpiry('2027-05')).toBe('2027-05-01');
  });
  it('passes through a full date', () => {
    expect(normalizeExpiry('2027-05-15')).toBe('2027-05-15');
  });
  it('rejects malformed input', () => {
    expect(normalizeExpiry('May 2027')).toBeNull();
    expect(normalizeExpiry('2027')).toBeNull();
  });
});

describe('parseOpeningStockRow', () => {
  const base = { sku: 'pms-ana-d65', batchNumber: 'B2201', expiryDate: '2027-05', quantity: '50', costPrice: '8', mrp: '15' };

  it('parses a valid row and upper-cases the sku', () => {
    const r = parseOpeningStockRow(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ sku: 'PMS-ANA-D65', batchNumber: 'B2201', expiryDate: '2027-05-01', quantity: 50, costPrice: 8, mrp: 15 });
    }
  });

  it('allows a missing expiry and mrp', () => {
    const r = parseOpeningStockRow({ sku: 'X1', batchNumber: 'B', quantity: '5', costPrice: '3' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.expiryDate).toBeUndefined();
      expect(r.value.mrp).toBeUndefined();
    }
  });

  it('rejects missing sku / batch / bad quantity / bad cost / bad expiry', () => {
    expect(parseOpeningStockRow({ ...base, sku: '' }).ok).toBe(false);
    expect(parseOpeningStockRow({ ...base, batchNumber: '' }).ok).toBe(false);
    expect(parseOpeningStockRow({ ...base, quantity: '0' }).ok).toBe(false);
    expect(parseOpeningStockRow({ ...base, quantity: '2.5' }).ok).toBe(false);
    expect(parseOpeningStockRow({ ...base, costPrice: '-1' }).ok).toBe(false);
    expect(parseOpeningStockRow({ ...base, expiryDate: 'soon' }).ok).toBe(false);
  });
});
