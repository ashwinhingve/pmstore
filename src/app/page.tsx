import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import Product from '@/models/Product';
import SiteSettings from '@/models/SiteSettings';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import { Hero } from '@/components/landing/Hero';
import type { HeroSlideView } from '@/components/landing/HeroCarousel';
import { PromoBar } from '@/components/landing/PromoBar';
import { VideoSection } from '@/components/landing/VideoSection';
import { QuickActions } from '@/components/landing/QuickActions';
import { Categories } from '@/components/landing/Categories';
import { FeaturedProducts } from '@/components/landing/FeaturedProducts';
import { TrustBand } from '@/components/landing/TrustBand';
import { Testimonials } from '@/components/landing/Testimonials';
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
 * Sections:
 * 1. Hero — premium gradient, search bar, CTAs
 * 2. VideoSection — local mp4, lazy-loads on intersection
 * 3. QuickActions — search / order again / upload prescription
 * 4. Categories — curated pharma categories
 * 5. FeaturedProducts — carousel of bestsellers
 * 6. TrustBand — stats + VALUE_PROPS + marketplace logos
 * 7. Testimonials — sample customer feedback
 * 8. FaqPreview — 4 FAQs using Accordion
 * 9. ContactCta — contact info + WhatsApp + contact form link
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
      <Hero slides={heroSlides} />
      <PromoBar />
      <QuickActions signedIn={signedIn} />
      <VideoSection />
      <FeaturedProducts products={featuredProducts} />
      <Categories />
      <TrustBand />
      <Testimonials />
      <FaqPreview />
      <ContactCta />
    </div>
  );
}
