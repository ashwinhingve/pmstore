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

  it('adds the weight charge for a heavier parcel below the free threshold', () => {
    const r = calculateShipping(400, 1500, '110001'); // standard value tier, 1-2kg band
    expect(r.breakdown.baseRate).toBe(20);
    expect(r.breakdown.weightCharge).toBe(40);
  });
});

describe('calculateShipping — free delivery threshold (₹499)', () => {
  it('still charges below the threshold', () => {
    const r = calculateShipping(498, 200, '110001');
    expect(r.tier.name).toBe('standard');
    expect(r.breakdown.total).toBeGreaterThan(0);
  });

  it('is fully free at the threshold, even for a heavy/far parcel', () => {
    const r = calculateShipping(499, 4000, '682001'); // far pincode, 2-5kg band
    expect(r.tier.name).toBe('free');
    expect(r.tier.cost).toBe(0);
    expect(r.breakdown.baseRate).toBe(0);
    expect(r.breakdown.weightCharge).toBe(0);
    expect(r.breakdown.distanceCharge).toBe(0);
    expect(r.breakdown.total).toBe(0);
  });

  it('stays free well above the threshold', () => {
    const r = calculateShipping(1200, 6000, '682001');
    expect(r.breakdown.total).toBe(0);
  });
});
