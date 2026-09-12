import mongoose, { Schema, Document } from 'mongoose';

export interface IShipmentScan {
  status: string;
  location: string;
  timestamp: Date;
  remarks?: string;
}

export interface IShipment extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  waybill: string;
  courierName: string;
  provider: 'delhivery' | 'shiprocket' | 'manual';
  /** Provider's internal ID used for API calls.
   *  Delhivery: same as waybill.
   *  Shiprocket: numeric shipment_id (required for tracking API). */
  providerShipmentId: string;
  /** Provider-specific tracking URL stored at creation time. */
  trackingUrl?: string;
  shipmentStatus: string;
  pickupDate?: Date;
  deliveryDate?: Date;
  currentLocation?: string;
  /** Courier pickup-request id — Delhivery pickup_id / Shiprocket pickup_token_number.
   *  Delhivery: shared across all shipments picked up on the same day. */
  pickupId?: string;
  /** 'Scheduled' once a pickup has been requested. */
  pickupStatus?: string;
  /** The day the courier will collect (UTC midnight of the scheduled date). */
  pickupScheduledDate?: Date;
  /** When we raised the pickup request. */
  pickupRequestedAt?: Date;
  scans: IShipmentScan[];
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    waybill: {
      type: String,
      required: true,
      unique: true,
    },
    courierName: {
      type: String,
    },
    provider: {
      type: String,
      enum: ['delhivery', 'shiprocket', 'manual'],
      default: 'delhivery',
    },
    providerShipmentId: {
      type: String,
      default: '',
    },
    trackingUrl: {
      type: String,
    },
    shipmentStatus: {
      type: String,
      default: 'Pending',
    },
    pickupDate: {
      type: Date,
    },
    deliveryDate: {
      type: Date,
    },
    currentLocation: {
      type: String,
    },
    pickupId: {
      type: String,
    },
    pickupStatus: {
      type: String,
    },
    pickupScheduledDate: {
      type: Date,
    },
    pickupRequestedAt: {
      type: Date,
    },
    scans: [
      {
        status: { type: String, required: true },
        location: { type: String, required: true },
        timestamp: { type: Date, required: true },
        remarks: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

ShipmentSchema.index({ shipmentStatus: 1 });
ShipmentSchema.index({ createdAt: -1 });
ShipmentSchema.index({ provider: 1 });
// Supports the Delhivery "one pickup per day" reuse lookup.
ShipmentSchema.index({ provider: 1, pickupScheduledDate: -1 });

export default mongoose.models.Shipment ||
  mongoose.model<IShipment>('Shipment', ShipmentSchema);
