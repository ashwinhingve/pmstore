import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import SiteSettings from '@/models/SiteSettings';
import AnnouncementManager from '@/components/admin/AnnouncementManager';
import HeroSliderManager from '@/components/admin/HeroSliderManager';

export default async function AdminSettingsPage() {
  await requireAdmin();
  await connectDB();

  let settings = await SiteSettings.findOne({ key: 'global' }).lean() as any;

  if (!settings) {
    settings = await SiteSettings.create({
      key: 'global',
      announcementBanner: {
        enabled: true,
        announcements: [
          { text: 'Free Shipping Above ₹499', emoji: '🚚', isActive: true },
          { text: 'Boost Your Daily Nutrition with PMSTORE', emoji: '✨', isActive: true },
        ],
      },
      heroSlider: { slides: [] },
    });
    settings = settings.toObject();
  }

  const bannerData = {
    enabled: settings.announcementBanner?.enabled ?? true,
    announcements: (settings.announcementBanner?.announcements || []).map((a: any) => ({
      id: a._id?.toString() || Math.random().toString(36).slice(2),
      text: a.text,
      emoji: a.emoji || '',
      isActive: a.isActive ?? true,
    })),
  };

  const heroSlides = (settings.heroSlider?.slides || []).map((s: any) => ({
    _id: s._id?.toString(),
    image: s.image || '',
    imagePublicId: s.imagePublicId || '',
    title: s.title || '',
    subtitle: s.subtitle || '',
    description: s.description || '',
    ctaText: s.ctaText || '',
    ctaLink: s.ctaLink || '/products',
    ctaSecondaryText: s.ctaSecondaryText || '',
    ctaSecondaryLink: s.ctaSecondaryLink || '/products',
    isActive: s.isActive ?? true,
    order: s.order ?? 0,
  }));

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)]">Site Settings</h1>
        <p className="text-sm text-[var(--ink-40)] mt-1">
          Manage homepage content, announcement banner, and slider.
        </p>
      </div>

      {/* Hero Slider */}
      <HeroSliderManager initialSlides={heroSlides} />

      {/* Announcement Banner */}
      <AnnouncementManager initialData={bannerData} />
    </div>
  );
}
