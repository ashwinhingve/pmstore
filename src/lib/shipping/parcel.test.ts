import { describe, expect, it } from 'vitest';
import { chargeableWeightGrams, massInGrams, parcelSchema } from './parcel';

describe('measured shipping parcels', () => {
  const parcel = { weightGrams: 200, lengthCm: 15, widthCm: 10, heightCm: 5 };
  it('requires the whole parcel instead of silently using 500 grams', () => {
    expect(parcelSchema.safeParse({}).success).toBe(false);
    expect(parcelSchema.parse(parcel).weightGrams).toBe(200);
    for (const weight of [0, -1, NaN, Infinity]) {
      expect(parcelSchema.safeParse({ ...parcel, weightGrams: weight }).success).toBe(false);
    }
    expect(parcelSchema.safeParse({ ...parcel, lengthCm: 0 }).success).toBe(false);
  });
  it('converts actual mass units and leaves volumes and unknown weights unknown', () => {
    expect(massInGrams(0.2, 'kg')).toBe(200);
    expect(massInGrams(50, 'g')).toBe(50);
    expect(massInGrams()).toBeUndefined();
    expect(massInGrams(0)).toBeUndefined();
    expect(massInGrams(100, 'ml')).toBeUndefined();
    expect(massInGrams(1, 'L')).toBeUndefined();
  });
  it('uses the higher of packed mass and volumetric weight for the estimate', () => {
    expect(chargeableWeightGrams(parcel)).toBe(200);
    expect(chargeableWeightGrams({ ...parcel, lengthCm: 40, widthCm: 30, heightCm: 20 })).toBe(4800);
  });
});
