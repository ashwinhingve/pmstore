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
import type { CuratedCategoryBucket } from '@/components/landing/CuratedTabs';
import { ProductImageSlider } from '@/components/landing/ProductImageSlider';
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
 *  2. ProductImageSlider — quiet, image-only circular product strip
 *  3. ProductImageSlider (OTC) — same strip, filtered to scheduleClass 'OTC'
 *     and labeled, so shoppers can jump straight to over-the-counter items
 *  4. Categories — image-backed pharma category grid + a Request-medicine CTA
 *  5. CuratedTabs — tabbed grid of the store's top medicine categories
 *  6. ProductMarquee — "More to explore": a compact, continuously-sliding row
 *     mixing products across categories
 *  7. QuickActions — search / order again / upload prescription / request medicine
 *  8. FeatureSlider — admin-managed 2-up image band that slides in from the left
 *  9. PromoBanners — prescription-upload + reorder feature banners
 * 10. TrustBand — stats + VALUE_PROPS + credentials
 * 11. WhyChooseUs — three photography-led reasons to trust the store
 * 12. FaqPreview — 4 FAQs using Accordion
 * 13. PromoBar — headline-offers strip (the "Everyday savings" discount cards)
 * 14. ContactCta — contact info + WhatsApp + contact form link
 */
export default async function Home() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user);

  // Top medicine categories for the "Shop by category" tabbed grid, each with
  // a small pre-fetched slice of its top products.
  let categoryBuckets: CuratedCategoryBucket[] = [];
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
  // Over-the-counter medicines only (scheduleClass 'OTC') for the homepage's
  // OTC sliding band, between the featured-medicines strip and Categories.
  let otcProducts: ProductCardData[] = [];
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

    // Top 4 categories by active product count, each with its own top-8
    // products by orderCount — real medicine categories, not marketing flags.
    const topCategoryAgg = await Product.aggregate([
      { $match: base },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 4 },
    ]);
    const topCategoryDocs = topCategoryAgg.filter((c) => c._id);
    if (topCategoryDocs.length > 0) {
      const categoryDocs = await Category.find({ _id: { $in: topCategoryDocs.map((c) => c._id) } })
        .select('name')
        .lean();
      const nameById = new Map(categoryDocs.map((c: any) => [String(c._id), c.name as string]));

      const orderedIds = topCategoryDocs
        .map((c) => String(c._id))
        .filter((id) => nameById.has(id));

      const productsByCategory = await Promise.all(
        orderedIds.map((id) =>
          Product.find({ ...base, category: id })
            .sort({ orderCount: -1, createdAt: -1 })
            .limit(8)
            .lean()
            .exec()
        )
      );

      categoryBuckets = orderedIds.map((id, i) => ({
        id,
        name: nameById.get(id) as string,
        products: serialize(productsByCategory[i]),
      }));
    }

    // Read site settings for admin-curated product sliders
    const settings = await SiteSettings.findOne({ key: 'global' })
      .select('heroSlider featureSlider productSliders')
      .lean();

    // "Featured medicines" slider — use admin-curated list if available and non-empty,
    // otherwise fall back to top products by orderCount
    const featuredProductIds = (settings as any)?.productSliders?.featured?.productIds || [];
    if (featuredProductIds.length > 0) {
      const featuredDocs = await Product.find({
        _id: { $in: featuredProductIds },
        ...base,
      })
        .select('-__v')
        .lean()
        .exec();

      // Preserve the curated order
      const docById = new Map(featuredDocs.map((p: any) => [String(p._id), p]));
      const featured = featuredProductIds
        .map((id: any) => docById.get(String(id)))
        .filter((p: any): p is any => p !== undefined);
      marqueeProducts = serialize(featured);
    } else {
      // Fallback: top products by orderCount
      const marquee = await Product.find(base)
        .sort({ orderCount: -1, updatedAt: -1 })
        .limit(16)
        .lean()
        .exec();
      marqueeProducts = serialize(marquee);
    }

    // OTC-only slider — use admin-curated list if available and non-empty,
    // otherwise fall back to OTC products by orderCount
    const otcProductIds = (settings as any)?.productSliders?.otc?.productIds || [];
    if (otcProductIds.length > 0) {
      const otcDocs = await Product.find({
        _id: { $in: otcProductIds },
        ...base,
      })
        .select('-__v')
        .lean()
        .exec();

      // Preserve the curated order
      const docById = new Map(otcDocs.map((p: any) => [String(p._id), p]));
      const otc = otcProductIds
        .map((id: any) => docById.get(String(id)))
        .filter((p: any): p is any => p !== undefined);
      otcProducts = serialize(otc);
    } else {
      // Fallback: OTC products by orderCount
      const otc = await Product.find({ ...base, scheduleClass: 'OTC' })
        .sort({ orderCount: -1, updatedAt: -1 })
        .limit(14)
        .lean()
        .exec();
      otcProducts = serialize(otc);
    }
    // Active hero + feature slides, ordered; serialize ObjectId at the boundary
    // and drop any slide without an image so the carousels never render a blank.
    // (settings already fetched above for productSliders, so we just reuse it)
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
      <ProductImageSlider products={marqueeProducts.slice(0, 14)} />
      <ProductImageSlider
        products={otcProducts}
        title="Over-the-counter essentials"
        ariaLabel="Over-the-counter medicines"
        variant="card"
      />
      <Categories categories={categoryCards} />
      <CuratedTabs buckets={categoryBuckets} />
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
