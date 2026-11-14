import { z } from 'zod';
import { deliveryPolicySchema } from '@/lib/shipping/delivery-policy';

export const siteSettingsUpdateSchema = z.object({
  delivery: deliveryPolicySchema.optional(),
  announcementBanner: z.object({
    enabled: z.boolean(),
    announcements: z.array(z.object({
      text: z.string().trim().min(1).max(250), emoji: z.string().max(20).default(''),
      icon: z.enum(['truck', 'savings', 'lab', 'shield', 'message']).optional(), isActive: z.boolean(),
    }).strict()).max(50),
  }).strict().optional(),
  heroSlider: z.object({ slides: z.array(z.object({
    _id: z.string().optional(), image: z.string().max(2048), imagePublicId: z.string().max(300),
    title: z.string().max(300), subtitle: z.string().max(300), description: z.string().max(2000),
    ctaText: z.string().max(100), ctaLink: z.string().max(2048),
    ctaSecondaryText: z.string().max(100), ctaSecondaryLink: z.string().max(2048),
    isActive: z.boolean(), order: z.number().int().min(0),
  })).max(30) }).optional(),
}).strict();
