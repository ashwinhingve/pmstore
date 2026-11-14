import { Schema } from 'mongoose';

export const confirmedParcelSchema = new Schema({
  weightGrams: { type: Number, required: true, min: Number.MIN_VALUE },
  lengthCm: { type: Number, required: true, min: Number.MIN_VALUE },
  widthCm: { type: Number, required: true, min: Number.MIN_VALUE },
  heightCm: { type: Number, required: true, min: Number.MIN_VALUE },
  confirmedAt: { type: Date, required: true },
  confirmedBy: { type: String, required: true },
}, { _id: false });

export const courierEstimateSchema = new Schema({
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['INR'], required: true },
  estimatedAt: { type: Date, required: true },
  chargeableWeightGrams: { type: Number, required: true },
  paymentMode: { type: String, enum: ['prepaid', 'cod'], required: true },
  codAmount: { type: Number, required: true },
  originPincode: { type: String, required: true },
  destinationPincode: { type: String, required: true },
  service: { type: String, enum: ['Surface'], required: true },
}, { _id: false });
