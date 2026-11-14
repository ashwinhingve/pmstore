import { Schema } from 'mongoose';

export const pickupSchema = new Schema({
  id: String, name: String, active: Boolean,
  delhiveryWarehouse: String, shiprocketWarehouse: String,
  pincode: String, address: String, city: String, state: String, country: String, phone: String,
  freeDeliveryPincodes: [String],
}, { _id: false });

export const deliverySettingsSchema = new Schema({
  pickupLocations: [pickupSchema], defaultPickupLocationId: String,
  freeDelivery: { enabled: { type: Boolean, default: false }, showInBanner: { type: Boolean, default: true }, bannerText: String },
}, { _id: false });

export const partnerBillingSchema = new Schema({
  amount: { type: Number, required: true, min: 0 },
  reference: { type: String, required: true },
  chargeDate: { type: Date, required: true },
  status: { type: String, enum: ['paid', 'unpaid'], required: true },
  source: { type: String, enum: ['wallet', 'invoice'], required: true },
  recordedBy: { type: String, required: true }, recordedAt: { type: Date, required: true },
}, { _id: false });
