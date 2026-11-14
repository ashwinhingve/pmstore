import { z } from 'zod';

export const parcelSchema = z.object({
  weightGrams: z.number().finite().positive().max(1000000),
  lengthCm: z.number().finite().positive().max(1000),
  widthCm: z.number().finite().positive().max(1000),
  heightCm: z.number().finite().positive().max(1000),
}).strict();

export type ParcelMeasurements = z.infer<typeof parcelSchema>;

export interface ConfirmedParcel extends ParcelMeasurements {
  confirmedAt: Date;
  confirmedBy: string;
}

export interface CourierEstimate {
  total: number;
  currency: 'INR';
  estimatedAt: Date;
  chargeableWeightGrams: number;
  paymentMode: 'prepaid' | 'cod';
  codAmount: number;
  originPincode: string;
  destinationPincode: string;
  service: 'Surface';
}

/** Volume is never a mass measurement. Missing/zero/volume weights stay unknown. */
export function massInGrams(weight?: number | null, unit = 'g'): number | undefined {
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) return undefined;
  if (unit === 'g') return weight;
  if (unit === 'kg') return weight * 1000;
  return undefined;
}

export function chargeableWeightGrams(parcel: ParcelMeasurements): number {
  return Math.ceil(Math.max(parcel.weightGrams, parcel.lengthCm * parcel.widthCm * parcel.heightCm / 5));
}
