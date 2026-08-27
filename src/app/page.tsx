import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import Product from '@/models/Product';
import SiteSettings from '@/models/SiteSettings';
import Category from '@/models/Category';
import { SITE_SHORT_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import { HeroSlider } from '@/components/landing/HeroSlider';
import type { HeroSlideView } from '@/components/landing/HeroSlider';
import { FeatureSlider } from '@/components/landing/FeatureSlider';
import type { FeatureSlideView } from '@/components/landing/FeatureSlider';
import { PromoBar } from '@/components/landing/PromoBar';
import { QuickActions } from '@/components/landing/QuickActions';
import { Categories } from '@/components/landing/Categories';
import type { CategoryCardView } from '@/components/landing/Categories';
import { PromoBanners } from '@/components/landing/PromoBanners';
import { CuratedTabs } from '@/components/landing/CuratedTabs';
import type { CuratedBuckets } from '@/components/landing/CuratedTabs';
import { ProductMarquee } from '@/components/landing/ProductMarquee';
import type { ProductCardData } from '@/components/products/ProductCard';
import { TrustBand } from '@/components/landing/TrustBand';
import { WhyChooseUs } from '@/components/landing/WhyChooseUs';
import { FaqPreview } from '@/components/landing/FaqPreview';
import { ContactCta } from '@/components/landing/ContactCta';

export const metadata: Metadata = {
  title: `${SITE_SHORT_NAME} — Online Pharmacy in Bhopal | Order Medicines Online`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_SHORT_NAME} — Online Pharmacy in Bhopal | Order Medicines Online`,
    description: SITE_DESCRIPTION,
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: SITE_SHORT_NAME,
      },
    ],
  },
};

/**
 * Home — premium marketing landing page for PM Store.
 * Server-fetches curated product buckets, respects user session.
 *
 * Sections (in render order):
 *  1. HeroSlider — full-bleed image slider with search + CTAs
 *  2. Categories — image-backed pharma category grid + a Request-medicine CTA
 *  3. CuratedTabs — tabbed grid: Bestsellers / New arrivals / Value buys / Trending
 *  4. ProductMarquee — "More to explore": a compact, continuously-sliding row
 *     mixing products across categories
 *  5. QuickActions — search / order again / upload prescription / request medicine
 *  6. FeatureSlider — admin-managed 2-up image band that slides in from the left
 *  7. PromoBanners — prescription-upload + reorder feature banners
 *  8. TrustBand — stats + VALUE_PROPS + credentials
 *  9. WhyChooseUs — three photography-led reasons to trust the store
 * 10. FaqPreview — 4 FAQs using Accordion
 * 11. PromoBar — headline-offers strip (the "Everyday savings" discount cards)
 * 12. ContactCta — contact info + WhatsApp + contact form link
 */
export default async function Home() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user);

  // Four curated collections for the "Shop by" tabbed grid. Each is a small
  // pre-fetched slice; buckets fall back to derived ordering so no tab is empty.
  let buckets: CuratedBuckets = {
    bestsellers: [],
    newArrivals: [],
    valueBuys: [],
    trending: [],
  };
  // Admin-managed hero slides (Admin → Site settings). Empty → HeroCarousel
  // falls back to its built-in photo set.
  let heroSlides: HeroSlideView[] = [];
  // Admin-managed feature slides (the 2-up band below the hero). Empty →
  // FeatureSlider falls back to a curated pair.
  let featureSlides: FeatureSlideView[] = [];
  // Admin-managed categories (name + image, editable at /admin/categories). Empty
  // → Categories falls back to the canonical taxonomy so the grid is never blank.
  let categoryCards: CategoryCardView[] = [];
  // A larger, cross-category slice for the "More to explore" marquee — not
  // filtered to one category, sized for a sliding row rather than a grid tab.
  let marqueeProducts: ProductCardData[] = [];
  try {
    await connectDB();

    // Deep-serialize for client consumption — round-tripping through JSON turns
    // every ObjectId (including nested salts[]._id / images[]._id) into a string
    // and yields plain objects, which Client Components require.
    const serialize = (rows: any[]): ProductCardData[] =>
      rows.map((p: any) => {
        const plain = JSON.parse(JSON.stringify(p));
        return {
          ...plain,
          category:
            typeof plain.category === 'object' && plain.category
              ? { name: plain.category.name || 'Uncategorized' }
              : plain.category || 'Uncategorized',
        };
      });

    const base = { isActive: true, isDiscontinued: false } as const;
    const bucket = (filter: Record<string, unknown>, sort: Record<string, 1 | -1>) =>
      Product.find({ ...base, ...filter }).sort(sort).limit(8).lean().exec();

    // Each bucket prefers its admin flag, then falls back to a derived ordering so
    // the tab is populated even before the flags are set in the admin panel.
    let bestsellers = await bucket({ isBestseller: true }, { orderCount: -1, createdAt: -1 });
    if (bestsellers.length === 0) bestsellers = await bucket({}, { orderCount: -1, createdAt: -1 });

    const newArrivals = await bucket({}, { createdAt: -1 });

    let valueBuys = await bucket({ isValueBuy: true }, { discountPercentage: -1 });
    if (valueBuys.length === 0)
      valueBuys = await bucket({ discountPercentage: { $gt: 0 } }, { discountPercentage: -1 });

    let trending = await bucket({ isTrending: true }, { orderCount: -1 });
    if (trending.length === 0) trending = await bucket({}, { updatedAt: -1, orderCount: -1 });

    buckets = {
      bestsellers: serialize(bestsellers),
      newArrivals: serialize(newArrivals),
      valueBuys: serialize(valueBuys),
      trending: serialize(trending),
    };

    // "More to explore" marquee — a wider, cross-category pull (not gated on
    // isTrending) so it reads as a different set from the Trending tab above.
    const marquee = await Product.find(base)
      .sort({ orderCount: -1, updatedAt: -1 })
      .limit(16)
      .lean()
      .exec();
    marqueeProducts = serialize(marquee);
    // Active hero + feature slides, ordered; serialize ObjectId at the boundary
    // and drop any slide without an image so the carousels never render a blank.
    const settings = await SiteSettings.findOne({ key: 'global' })
      .select('heroSlider featureSlider')
      .lean();
    heroSlides = ((settings as any)?.heroSlider?.slides ?? [])
      .filter((s: any) => s.isActive && s.image)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((s: any) => ({
        _id: String(s._id),
        image: s.image as string,
        title: s.title || undefined,
      }));
    featureSlides = ((settings as any)?.featureSlider?.slides ?? [])
      .filter((s: any) => s.isActive && s.image)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((s: any) => ({
        _id: String(s._id),
        image: s.image as string,
        title: s.title || undefined,
        ctaLink: s.ctaLink || undefined,
      }));

    // Active categories, ordered — drives the homepage category grid.
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1 })
      .select('name slug image')
      .lean();
    categoryCards = categories.map((c: any) => ({
      name: c.name as string,
      slug: c.slug as string,
      image: (c.image as string) || undefined,
    }));
  } catch (error) {
    // Silent fail — if catalogue is unseeded, we show empty state gracefully
    console.error('Failed to fetch home page data:', error);
  }

  return (
    <div className="w-full">
      {/* The hero is image-only by design, so this is the page's single H1 —
          it carries the brand + core intent for the "PM Store" search query. */}
      <h1 className="sr-only">
        PM Store — online pharmacy in Bhopal. Order medicines online, compare brands by price per
        tablet, and get free home delivery.
      </h1>
      {/* Sections alternate --paper / --paper-tint bands; no hairline dividers */}
      <HeroSlider slides={heroSlides} />
      <Categories categories={categoryCards} />
      <CuratedTabs buckets={buckets} />
      <ProductMarquee products={marqueeProducts} />
      <QuickActions signedIn={signedIn} />
      <FeatureSlider slides={featureSlides} />
      <PromoBanners />
      <TrustBand />
      <WhyChooseUs />
      <FaqPreview />
      <PromoBar />
      <ContactCta />
    </div>
  );
}
