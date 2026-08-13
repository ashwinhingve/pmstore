import type { Metadata } from 'next';
import Link from 'next/link';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import { ProductCard, type ProductCardData } from '@/components/products/ProductCard';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { SITE_URL } from '@/lib/constants';
import { safeJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = {
  title: 'Bestselling medicines',
  description:
    'The most-ordered medicines and health products at PM Store. Compare brands by price per tablet, upload a prescription, and reorder in one tap.',
  alternates: { canonical: '/bestsellers' },
  openGraph: {
    title: 'Bestselling medicines — PM Store',
    description:
      'The most-ordered medicines and health products at PM Store — compare brands by price per tablet and reorder in one tap.',
    url: `${SITE_URL}/bestsellers`,
    type: 'website',
  },
};

// Regenerate hourly — bestsellers move slowly and this keeps the page fast + SEO-friendly.
export const revalidate = 3600;

const LIMIT = 24;

/**
 * Bestsellers — the most-ordered products, ranked automatically by orderCount
 * (the same signal the homepage "Featured medicines" carousel uses). No manual
 * admin picking: the ranking follows real sales. The catalogue itself is
 * admin-managed, so which products can appear here is controlled at
 * /admin/products.
 */
export default async function BestsellersPage() {
  let products: ProductCardData[] = [];
  try {
    await connectDB();
    const rows = await Product.find({ isActive: true, isDiscontinued: { $ne: true } })
      .sort({ orderCount: -1, createdAt: -1 })
      .limit(LIMIT)
      .lean();

    // Deep-serialize for the client ProductCard — turns every ObjectId (incl.
    // nested salts[]._id / images[]._id) into a string and yields plain objects.
    products = rows.map((p: any) => {
      const plain = JSON.parse(JSON.stringify(p));
      return {
        ...plain,
        category:
          typeof plain.category === 'object' && plain.category
            ? { name: plain.category.name || 'Uncategorized' }
            : plain.category || 'Uncategorized',
      };
    });
  } catch (error) {
    console.error('Bestsellers: failed to load products:', error);
  }

  const itemListJsonLd =
    products.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Bestselling medicines at PM Store',
          itemListElement: products.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.name,
            url: `${SITE_URL}/products/${p.slug}`,
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
        />
      )}

      <Container className="py-12 sm:py-16">
        <SectionHeading
          eyebrow="Most loved"
          title="Bestselling medicines"
          description="The products our customers order most — compare brands by price per tablet and reorder in one tap."
          className="mb-10"
        />

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id || product.id || product.slug} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No bestsellers to show yet"
            description="As orders come in, the most-loved medicines will appear here. Meanwhile, browse the full catalogue."
            className="bg-[var(--paper-card)]"
          >
            <Button asChild variant="outline">
              <Link href="/products">Browse all medicines</Link>
            </Button>
          </EmptyState>
        )}
      </Container>
    </div>
  );
}
