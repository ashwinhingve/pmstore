import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketingSettings extends Document {
  key: string;
  gtm_id: string;
  gtm_enabled: boolean;
  google_analytics_id: string;
  google_ads_conversion_id: string;
  google_ads_label: string;
  meta_pixel_id: string;
  search_console_verified: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const MarketingSettingsSchema = new Schema<IMarketingSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
    },
    gtm_id: { type: String, default: '' },
    gtm_enabled: { type: Boolean, default: false },
    google_analytics_id: { type: String, default: '' },
    google_ads_conversion_id: { type: String, default: '' },
    google_ads_label: { type: String, default: '' },
    meta_pixel_id: { type: String, default: '' },
    search_console_verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.MarketingSettings ||
  mongoose.model<IMarketingSettings>('MarketingSettings', MarketingSettingsSchema);
