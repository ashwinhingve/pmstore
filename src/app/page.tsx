import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import Product from '@/models/Product';
import SiteSettings from '@/models/SiteSettings';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import { HeroSlider } from '@/components/landing/HeroSlider';
import type { HeroSlideView } from '@/components/landing/HeroSlider';
import { PromoBar } from '@/components/landing/PromoBar';
import { QuickActions } from '@/components/landing/QuickActions';
import { Categories } from '@/components/landing/Categories';
import { PromoBanners } from '@/components/landing/PromoBanners';
import { FeaturedProducts } from '@/components/landing/FeaturedProducts';
import { TrustBand } from '@/components/landing/TrustBand';
import { WhyChooseUs } from '@/components/landing/WhyChooseUs';
import { FaqPreview } from '@/components/landing/FaqPreview';
import { ContactCta } from '@/components/landing/ContactCta';

export const metadata: Metadata = {
  title: `${SITE_NAME} | Genuine Medicines Online`,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: `${SITE_NAME} | Genuine Medicines Online`,
    description: SITE_DESCRIPTION,
    type: 'website',
    images: [
      {
        url: '/logo.svg',
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
  },
};

interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  originalPrice?: number;
  images?: Array<{ url: string }>;
  form?: string;
  stock: number;
  category?: { name: string } | string;
  averageRating?: number;
  totalReviews?: number;
  packSize?: number;
  packUnit?: string;
  unitPrice?: number;
}

/**
 * Home — premium marketing landing page for Pratigya Medical Store.
 * Server-fetches featured products, respects user session.
 *
 * Sections (in render order):
 *  1. HeroSlider — full-bleed image slider with search + CTAs
 *  2. PromoBar — compact headline-offers band
 *  3. Categories — image-backed pharma category grid
 *  4. QuickActions — search / order again / upload prescription
 *  5. FeaturedProducts — carousel of bestsellers
 *  6. PromoBanners — prescription-upload + reorder feature banners
 *  7. TrustBand — stats + VALUE_PROPS + credentials
 *  8. WhyChooseUs — three photography-led reasons to trust the store
 *  9. FaqPreview — 4 FAQs using Accordion
 * 10. ContactCta — contact info + WhatsApp + contact form link
 */
export default async function Home() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user);

  // Fetch ~8 featured products
  let featuredProducts: Product[] = [];
  // Admin-managed hero slides (Admin → Site settings). Empty → HeroCarousel
  // falls back to its built-in photo set.
  let heroSlides: HeroSlideView[] = [];
  try {
    await connectDB();
    const products = await Product.find({
      isActive: true,
      isDiscontinued: false,
    })
      .sort({ orderCount: -1 })
      .limit(8)
      .lean()
      .exec();

    // Deep-serialize for client consumption — round-tripping through JSON turns
    // every ObjectId (including nested salts[]._id / images[]._id) into a string
    // and yields plain objects, which Client Components require.
    featuredProducts = products.map((p: any) => {
      const plain = JSON.parse(JSON.stringify(p));
      return {
        ...plain,
        category:
          typeof plain.category === 'object' && plain.category
            ? { name: plain.category.name || 'Uncategorized' }
            : plain.category || 'Uncategorized',
      };
    });
    // Active hero slides, ordered; serialize ObjectId at the boundary and drop
    // any slide without an image so the carousel never renders a blank frame.
    const settings = await SiteSettings.findOne({ key: 'global' })
      .select('heroSlider')
      .lean();
    heroSlides = ((settings as any)?.heroSlider?.slides ?? [])
      .filter((s: any) => s.isActive && s.image)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((s: any) => ({
        _id: String(s._id),
        image: s.image as string,
        title: s.title || undefined,
        subtitle: s.subtitle || undefined,
      }));
  } catch (error) {
    // Silent fail — if catalogue is unseeded, we show empty state gracefully
    console.error('Failed to fetch home page data:', error);
  }

  return (
    <div className="w-full">
      {/* Sections alternate --paper / --paper-tint bands; no hairline dividers */}
      <HeroSlider slides={heroSlides} />
      <PromoBar />
      <Categories />
      <QuickActions signedIn={signedIn} />
      <FeaturedProducts products={featuredProducts} />
      <PromoBanners />
      <TrustBand />
      <WhyChooseUs />
      <FaqPreview />
      <ContactCta />
    </div>
  );
}
