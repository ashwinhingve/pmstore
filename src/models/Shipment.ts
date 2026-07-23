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
  provider: 'delhivery' | 'shiprocket';
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
      enum: ['delhivery', 'shiprocket'],
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

export default mongoose.models.Shipment ||
  mongoose.model<IShipment>('Shipment', ShipmentSchema);
