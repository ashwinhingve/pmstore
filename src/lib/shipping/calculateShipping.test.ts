import { describe, it, expect } from 'vitest';
import { calculateShipping } from './calculateShipping';
import { isManualDeliveryPincode } from '@/lib/constants';

describe('isManualDeliveryPincode', () => {
  it('flags the store local pincode 462041 (trimmed)', () => {
    expect(isManualDeliveryPincode('462041')).toBe(true);
    expect(isManualDeliveryPincode(' 462041 ')).toBe(true);
  });

  it('does not flag other pincodes or empty input', () => {
    expect(isManualDeliveryPincode('110001')).toBe(false);
    expect(isManualDeliveryPincode('')).toBe(false);
    expect(isManualDeliveryPincode(null)).toBe(false);
    expect(isManualDeliveryPincode(undefined)).toBe(false);
  });
});

describe('calculateShipping — local hand-delivery zone', () => {
  it('is always free and same/next day, even for a low-value heavy order', () => {
    const r = calculateShipping(120, 3000, '462041'); // low value, heavy
    expect(r.tier.name).toBe('free');
    expect(r.tier.cost).toBe(0);
    expect(r.tier.estimatedDays).toBe(1);
    expect(r.breakdown.total).toBe(0);
    expect(r.breakdown.weightCharge).toBe(0);
    expect(r.breakdown.distanceCharge).toBe(0);
  });
});

describe('calculateShipping — courier zones still apply', () => {
  it('charges the standard base rate for a low-value light order', () => {
    const r = calculateShipping(120, 200, '110001');
    expect(r.breakdown.baseRate).toBe(30);
    expect(r.breakdown.weightCharge).toBe(0);
    expect(r.breakdown.total).toBeGreaterThanOrEqual(30);
  });

  it('adds the weight charge for a heavier parcel', () => {
    const r = calculateShipping(600, 1500, '110001'); // free value tier, 1-2kg band
    expect(r.breakdown.baseRate).toBe(0);
    expect(r.breakdown.weightCharge).toBe(40);
  });
});
