import SiteSettings, { type ISiteSettings, type IAnnouncement } from '@/models/SiteSettings';
import { CONTACT } from './constants';
import { EMPTY_DELIVERY_POLICY, pickupLocationSchema, readDeliveryPolicy, shouldPromoteDelivery } from './shipping/delivery-policy';

export const DEFAULT_ANNOUNCEMENTS: IAnnouncement[] = [
  { text: 'Free home delivery across Bhopal', emoji: '', icon: 'truck', isActive: true },
  { text: '60–70% off with generic brands', emoji: '', icon: 'savings', isActive: true },
  { text: '30–40% off pathology & lab tests', emoji: '', icon: 'lab', isActive: true },
  { text: 'Pharmacist-checked, government-approved', emoji: '', icon: 'shield', isActive: true },
  { text: `WhatsApp or call ${CONTACT.phone} to order`, emoji: '', icon: 'message', isActive: true },
];

export function mergeAnnouncements(existing: IAnnouncement[]) {
  const merged = [...existing];
  const seen = new Set(existing.map(item => item.text.trim().toLowerCase()));
  for (const item of DEFAULT_ANNOUNCEMENTS) {
    if (!seen.has(item.text.trim().toLowerCase())) merged.push(item);
  }
  return merged;
}

export function initialDeliveryPolicy() {
  const candidate = pickupLocationSchema.safeParse({
    id: 'existing-warehouse', name: process.env.DELHIVERY_RETURN_NAME,
    active: true, delhiveryWarehouse: process.env.DELHIVERY_RETURN_NAME,
    shiprocketWarehouse: process.env.SHIPROCKET_PICKUP_LOCATION ?? '',
    pincode: process.env.DELHIVERY_RETURN_PINCODE, address: process.env.DELHIVERY_RETURN_ADDRESS,
    city: process.env.DELHIVERY_RETURN_CITY, state: process.env.DELHIVERY_RETURN_STATE,
    phone: process.env.DELHIVERY_RETURN_PHONE, country: 'India', freeDeliveryPincodes: [],
  });
  return candidate.success ? { ...EMPTY_DELIVERY_POLICY, pickupLocations: [candidate.data], defaultPickupLocationId: candidate.data.id } : EMPTY_DELIVERY_POLICY;
}

/** Admin-only initialization. Public storefront reads never write settings. */
export async function ensureSiteSettings() {
  let settings = await SiteSettings.findOne({ key: 'global' });
  if (!settings) settings = await SiteSettings.create({ key: 'global', announcementBanner: { enabled: true, announcements: DEFAULT_ANNOUNCEMENTS }, delivery: initialDeliveryPolicy() });
  if (!settings.announcementDefaultsMigratedAt) {
    // A conditional update prevents an old initialization request overwriting a newer save.
    await SiteSettings.updateOne({ _id: settings._id, announcementDefaultsMigratedAt: null }, { $set: {
      'announcementBanner.announcements': mergeAnnouncements(settings.announcementBanner?.announcements ?? []),
      announcementDefaultsMigratedAt: new Date(),
      ...(!settings.delivery ? { delivery: initialDeliveryPolicy() } : {}),
    } });
    settings = await SiteSettings.findById(settings._id);
  }
  return settings;
}

export function publicAnnouncements(settings: Pick<ISiteSettings, 'announcementBanner' | 'delivery' | 'announcementDefaultsMigratedAt'> | null) {
  if (settings?.announcementBanner?.enabled === false) return { enabled: false, announcements: [] };
  const existing = settings?.announcementBanner?.announcements ?? [];
  const announcements = (settings?.announcementDefaultsMigratedAt ? existing : mergeAnnouncements(existing))
    .filter(item => item.isActive).map(({ text, emoji, icon }) => ({ text, emoji, icon }));
  const policy = readDeliveryPolicy(settings?.delivery);
  if (shouldPromoteDelivery(policy) && !announcements.some(item => item.text === policy.freeDelivery.bannerText)) {
    announcements.push({ text: policy.freeDelivery.bannerText, emoji: '🚚', icon: undefined });
  }
  return { enabled: true, announcements };
}

export type BannerContent = ReturnType<typeof publicAnnouncements>;
