import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import ProductImageGallery from '@/components/products/ProductImageGallery';
import ProductInfo from '@/components/products/ProductInfo';
import ProductDetailsTabs from '@/components/products/ProductDetailsTabs';
import { ProductCard } from '@/components/products/ProductCard';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { Strip } from '@/components/strip/Strip';
import { PriceBlock } from '@/components/shared/PriceBlock';
import { RxBadge } from '@/components/shared/RxBadge';
import { SaveButton } from '@/components/shared/SaveButton';
import { Accordion } from '@/components/ui/Accordion';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { getAlternatives } from '@/lib/pharma/alternatives-data';
import { formatComposition } from '@/lib/pharma/composition';
import { Stethoscope } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pmstore.in';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string }>;
}

function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const product = await Product.findOne({
    slug,
    isActive: true,
    isDiscontinued: { $ne: true },
  }).lean() as any;

  if (!product) {
    return { title: 'Product Not Found' };
  }

  const title = product.seo?.metaTitle || `${product.name} | PM Store`;
  const description = product.seo?.metaDescription || product.description;
  const ogImage = product.seo?.ogImage || product.images?.[0]?.url || `${SITE_URL}/images/logo.jpg`;
  const canonicalUrl = `${SITE_URL}/products/${product.slug}`;

  return {
    title,
    description,
    keywords: product.seo?.keywords?.length ? product.seo.keywords : (product.tags || []),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: product.seo?.metaTitle || product.name,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: 'PM Store',
      locale: 'en_IN',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: product.seo?.metaTitle || product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.seo?.metaTitle || product.name,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductDetailPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const { review } = await searchParams;
  await connectDB();

  const product = await Product.findOne({
    slug,
    isActive: true,
    isDiscontinued: { $ne: true },
  })
    .select('-__v')
    .populate('category', 'name slug')
    .lean() as any;

  if (!product) {
    notFound();
  }

  // Fetch related products (category is populated above, so match on its id)
  const categoryId = product.category?._id ?? product.category;
  const relatedProducts = await Product.find({
    category: categoryId,
    isActive: true,
    isDiscontinued: { $ne: true },
    _id: { $ne: product._id },
  })
    .select('name slug price originalPrice unitPrice packSize packUnit form images averageRating totalReviews category stock isFeatured isActive sku tags')
    .populate('category', 'name slug')
    .limit(4)
    .lean();

  // Serialize data
  const serializedProduct = JSON.parse(JSON.stringify(product));
  const serializedRelated = JSON.parse(JSON.stringify(relatedProducts));

  // The Strip — same-composition alternatives, ranked server-side.
  const strip = await getAlternatives(slug);

  const canonicalUrl = `${SITE_URL}/products/${serializedProduct.slug}`;

  // Product JSON-LD — enables price, availability, and star ratings in Google SERPs
  const productJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": serializedProduct.name,
    "description": serializedProduct.description,
    "image": (serializedProduct.images || []).map((img: any) => img.url).filter(Boolean),
    "sku": serializedProduct.sku,
    "brand": {
      "@type": "Brand",
      "name": "PMStore",
    },
    "offers": {
      "@type": "Offer",
      "url": canonicalUrl,
      "priceCurrency": "INR",
      "price": serializedProduct.price,
      "availability": serializedProduct.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": {
        "@type": "Organization",
        "name": "PM Store",
      },
    },
  };

  // Only add aggregateRating when actual reviews exist — Google requires this
  if (serializedProduct.averageRating > 0 && serializedProduct.totalReviews > 0) {
    productJsonLd["aggregateRating"] = {
      "@type": "AggregateRating",
      "ratingValue": serializedProduct.averageRating,
      "reviewCount": serializedProduct.totalReviews,
      "bestRating": 5,
      "worstRating": 1,
    };
  }

  // BreadcrumbList JSON-LD — shows breadcrumb path in SERPs
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_URL,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Products",
        "item": `${SITE_URL}/products`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": serializedProduct.category?.name ?? 'Products',
        "item": `${SITE_URL}/products?category=${encodeURIComponent(serializedProduct.category?.name ?? '')}`,
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": serializedProduct.name,
        "item": canonicalUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] py-8">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: serializedProduct.category?.name ?? 'Products', href: `/products?category=${encodeURIComponent(serializedProduct.category?.name ?? '')}` },
            { label: serializedProduct.name, href: '#' },
          ]}
        />

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-6">
          {/* Left: Image Gallery */}
          <ProductImageGallery
            images={serializedProduct.images}
            productName={serializedProduct.name}
            videoUrl={serializedProduct.videoUrl}
            form={serializedProduct.form}
          />

          {/* Right: Product Info */}
          <ProductInfo product={serializedProduct} autoOpenReview={review === '1'} />
        </div>

        {/* Compare & save — composition, pricing, and same-salt alternatives */}
        <div className="mt-12">
          <SectionHeading
            eyebrow="Compare & save"
            title="Same composition, better price"
            description="The price that matters is per tablet. Switch to a genuine, cheaper brand with the exact same salts."
          />
          <section className="mt-5 grid gap-8 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5 shadow-[var(--shadow-sm)] sm:p-6 md:grid-cols-3">
            <div className="space-y-4 md:col-span-1">
              {serializedProduct.scheduleClass && (
                <RxBadge scheduleClass={serializedProduct.scheduleClass} />
              )}
              {serializedProduct.salts?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-40)]">Composition</p>
                  <p className="strength mt-0.5 text-[var(--ink)]">
                    {formatComposition(serializedProduct.salts)}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--foil-soft)] pt-4">
                {serializedProduct.manufacturer && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-40)]">Manufacturer</p>
                    <p className="mt-0.5 text-[var(--ink)]">{serializedProduct.manufacturer}</p>
                  </div>
                )}
                {serializedProduct.packSize > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-40)]">Pack</p>
                    <p className="pack mt-0.5 text-[var(--ink)]">
                      {serializedProduct.packSize} {serializedProduct.packUnit}
                    </p>
                  </div>
                )}
              </div>
              {serializedProduct.unitPrice != null && (
                <div className="border-t border-[var(--foil-soft)] pt-4">
                  <PriceBlock
                    price={serializedProduct.price}
                    mrp={serializedProduct.mrp}
                    unitPrice={serializedProduct.unitPrice}
                    packSize={serializedProduct.packSize}
                    packUnit={serializedProduct.packUnit}
                  />
                </div>
              )}
              <SaveButton productId={String(serializedProduct._id)} showLabel />
            </div>
            <div className="md:col-span-2 md:border-l md:border-[var(--foil-soft)] md:pl-6">
              {strip && <Strip strip={strip} />}
            </div>
          </section>
        </div>

        {/* Usage / storage / safety — medical copy rendered verbatim */}
        {(serializedProduct.usageInstructions ||
          serializedProduct.storageInstructions ||
          serializedProduct.sideEffects?.length > 0 ||
          serializedProduct.contraindications?.length > 0) && (
          <div className="mt-12 max-w-3xl">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--mint-soft)] text-[var(--mint)]">
                <Stethoscope className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-[length:var(--step-1)] font-bold text-[var(--ink)]">
                Medical information
              </h2>
            </div>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-l-2 border-[var(--foil-soft)] border-l-[var(--mint)] bg-[var(--paper-card)] px-4 shadow-[var(--shadow-xs)]">
            {serializedProduct.usageInstructions && (
              <Accordion title="How to take it" defaultOpen>
                <p>{serializedProduct.usageInstructions}</p>
              </Accordion>
            )}
            {serializedProduct.storageInstructions && (
              <Accordion title="Storage">
                <p>{serializedProduct.storageInstructions}</p>
              </Accordion>
            )}
            {serializedProduct.sideEffects?.length > 0 && (
              <Accordion title="Side effects">
                <ul className="list-disc space-y-1 pl-5">
                  {serializedProduct.sideEffects.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </Accordion>
            )}
            {serializedProduct.contraindications?.length > 0 && (
              <Accordion title="When not to use it">
                <ul className="list-disc space-y-1 pl-5">
                  {serializedProduct.contraindications.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </Accordion>
            )}
            </div>
          </div>
        )}

        {/* Product Details Tabs */}
        <div className="mt-12">
          <ProductDetailsTabs
            longDescription={serializedProduct.longDescription}
            specifications={serializedProduct.specifications}
          />
        </div>

        {/* Related Products */}
        {serializedRelated.length > 0 && (
          <div className="mt-16">
            <SectionHeading
              eyebrow="More options"
              title="Related medicines"
              className="mb-6"
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {serializedRelated.map((relatedProduct: any) => (
                <ProductCard key={relatedProduct._id || relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
