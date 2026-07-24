import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import Product from '@/models/Product';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import { Hero } from '@/components/landing/Hero';
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

    // Serialize _id to string for client consumption
    featuredProducts = products.map((p: any) => ({
      ...p,
      _id: p._id.toString(),
      category:
        typeof p.category === 'object' && p.category
          ? { name: p.category.name || 'Uncategorized' }
          : p.category || 'Uncategorized',
    }));
  } catch (error) {
    // Silent fail — if catalogue is unseeded, we show empty state gracefully
    console.error('Failed to fetch featured products:', error);
  }

  return (
    <main className="w-full">
      {/* Each section is mounted with proper spacing via CSS */}
      <Hero />

      <div className="border-b border-[var(--foil-soft)]">
        <VideoSection />
      </div>

      <div className="border-b border-[var(--foil-soft)]">
        <QuickActions signedIn={signedIn} />
      </div>

      <div className="border-b border-[var(--foil-soft)]">
        <Categories />
      </div>

      <div className="border-b border-[var(--foil-soft)]">
        <FeaturedProducts products={featuredProducts} />
      </div>

      <div className="border-b border-[var(--foil-soft)]">
        <TrustBand />
      </div>

      <div className="border-b border-[var(--foil-soft)]">
        <Testimonials />
      </div>

      <div className="border-b border-[var(--foil-soft)]">
        <FaqPreview />
      </div>

      <ContactCta />
    </main>
  );
}
