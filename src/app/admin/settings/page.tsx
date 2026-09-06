import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import SiteSettings from '@/models/SiteSettings';
import Product from '@/models/Product';
import AnnouncementManager from '@/components/admin/AnnouncementManager';
import HeroSliderManager from '@/components/admin/HeroSliderManager';
import FeatureSliderManager from '@/components/admin/FeatureSliderManager';
import ProductCurationPanel from '@/components/admin/sliders/ProductCurationPanel';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

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

  const featureSlides = (settings.featureSlider?.slides || []).map((s: any) => ({
    _id: s._id?.toString(),
    image: s.image || '',
    imagePublicId: s.imagePublicId || '',
    title: s.title || '',
    ctaLink: s.ctaLink || '/products',
    isActive: s.isActive ?? true,
    order: s.order ?? 0,
  }));

  // Fetch featured and OTC curated products for the panels
  const featuredProductIds = (settings.productSliders?.featured?.productIds || []).map((id: any) =>
    id._id || id
  );
  const otcProductIds = (settings.productSliders?.otc?.productIds || []).map((id: any) =>
    id._id || id
  );

  const [featuredProducts, otcProducts] = await Promise.all([
    featuredProductIds.length > 0
      ? Product.find({ _id: { $in: featuredProductIds }, isActive: true }).select('_id name manufacturer price unitPrice images slug form category').lean()
      : Promise.resolve([]),
    otcProductIds.length > 0
      ? Product.find({ _id: { $in: otcProductIds }, isActive: true }).select('_id name manufacturer price unitPrice images slug form category').lean()
      : Promise.resolve([]),
  ]);

  const serializedFeaturedProducts = (featuredProducts as any[]).map((p) => ({
    _id: String(p._id),
    name: p.name,
    manufacturer: p.manufacturer,
    price: p.price,
    unitPrice: p.unitPrice,
    images: p.images || [],
    slug: p.slug,
    form: p.form,
    category: p.category,
  }));

  const serializedOtcProducts = (otcProducts as any[]).map((p) => ({
    _id: String(p._id),
    name: p.name,
    manufacturer: p.manufacturer,
    price: p.price,
    unitPrice: p.unitPrice,
    images: p.images || [],
    slug: p.slug,
    form: p.form,
    category: p.category,
  }));

  return (
    <div className="space-y-8 max-w-5xl">
      <AdminPageHeader
        title="Site Settings"
        description="Manage homepage content, announcement banner, and sliders."
      />

      {/* Hero Slider */}
      <HeroSliderManager initialSlides={heroSlides} />

      {/* Feature Slider (2-up band below the hero) */}
      <FeatureSliderManager initialSlides={featureSlides} />

      {/* Product Sliders (Admin-curated featured & OTC) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProductCurationPanel
          slot="featured"
          title="Featured Medicines Slider"
          description="Top medicines shown directly below the hero — circular avatars, no names. Admin curates which products and in what order."
          initialProducts={serializedFeaturedProducts}
        />
        <ProductCurationPanel
          slot="otc"
          title="Over-the-Counter Essentials"
          description="Common medicines available without prescription — shown as cards with names and prices below the featured slider."
          initialProducts={serializedOtcProducts}
        />
      </div>

      {/* Announcement Banner */}
      <AnnouncementManager initialData={bannerData} />
    </div>
  );
}
