import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement {
  text: string;
  emoji: string;
  isActive: boolean;
}

export interface IHeroSlide {
  _id?: mongoose.Types.ObjectId;
  image: string;
  imagePublicId: string;
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
  isActive: boolean;
  order: number;
}

/**
 * A feature-slider slide. Unlike the hero, this slider shows TWO images at a
 * time below the hero, so each slide is a single image with a link — the display
 * pairs them up. Kept deliberately flat (no CTA copy) so the admin editor is just
 * "upload an image, give it a link".
 */
export interface IFeatureSlide {
  _id?: mongoose.Types.ObjectId;
  image: string;
  imagePublicId: string;
  title: string;
  ctaLink: string;
  isActive: boolean;
  order: number;
}

export interface IProductSlot {
  productIds: mongoose.Types.ObjectId[];
}

export interface ISiteSettings extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  announcementBanner: {
    enabled: boolean;
    announcements: IAnnouncement[];
  };
  heroSlider: {
    slides: IHeroSlide[];
  };
  featureSlider: {
    slides: IFeatureSlide[];
  };
  productSliders?: {
    featured?: IProductSlot;
    otc?: IProductSlot;
  };
  updatedAt: Date;
  createdAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
    },
    announcementBanner: {
      enabled: {
        type: Boolean,
        default: true,
      },
      announcements: [
        {
          text: { type: String, required: true },
          emoji: { type: String, default: '' },
          isActive: { type: Boolean, default: true },
        },
      ],
    },
    heroSlider: {
      slides: [
        {
          image: { type: String, default: '' },
          imagePublicId: { type: String, default: '' },
          title: { type: String, default: '' },
          subtitle: { type: String, default: '' },
          description: { type: String, default: '' },
          ctaText: { type: String, default: '' },
          ctaLink: { type: String, default: '/products' },
          ctaSecondaryText: { type: String, default: '' },
          ctaSecondaryLink: { type: String, default: '/products' },
          isActive: { type: Boolean, default: true },
          order: { type: Number, default: 0 },
        },
      ],
    },
    featureSlider: {
      slides: [
        {
          image: { type: String, default: '' },
          imagePublicId: { type: String, default: '' },
          title: { type: String, default: '' },
          ctaLink: { type: String, default: '/products' },
          isActive: { type: Boolean, default: true },
          order: { type: Number, default: 0 },
        },
      ],
    },
    productSliders: {
      featured: {
        productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      },
      otc: {
        productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SiteSettings ||
  mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
