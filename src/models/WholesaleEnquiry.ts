import mongoose, { Schema, Document } from 'mongoose';

export interface IWholesaleEnquiry extends Document {
  _id: mongoose.Types.ObjectId;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber?: string;
  drugLicenseNumber?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  productRequirements?: string;
  quantity?: string;
  preferredBrands?: string;
  monthlyVolume?: string;
  notes?: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const WholesaleEnquirySchema = new Schema<IWholesaleEnquiry>(
  {
    businessName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    gstNumber: { type: String, trim: true, uppercase: true },
    drugLicenseNumber: { type: String, trim: true },
    addressLine: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    productRequirements: { type: String, trim: true },
    quantity: { type: String, trim: true },
    preferredBrands: { type: String, trim: true },
    monthlyVolume: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'contacted', 'closed'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.WholesaleEnquiry ||
  mongoose.model<IWholesaleEnquiry>('WholesaleEnquiry', WholesaleEnquirySchema);
