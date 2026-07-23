import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import ProductImageGallery from '@/components/products/ProductImageGallery';
import ProductInfo from '@/components/products/ProductInfo';
import ProductDetailsTabs from '@/components/products/ProductDetailsTabs';
import { ProductCard } from '@/components/products/ProductCard';
import Breadcrumbs from '@/components/shared/Breadcrumbs';

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
  }).lean() as any;

  if (!product) {
    return { title: 'Product Not Found' };
  }

  const title = product.seo?.metaTitle || `${product.name} | PMStore`;
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
      siteName: 'PMStore',
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
  })
    .select('-__v')
    .lean() as any;

  if (!product) {
    notFound();
  }

  // Fetch related products
  const relatedProducts = await Product.find({
    category: product.category,
    isActive: true,
    _id: { $ne: product._id },
  })
    .select('name slug price originalPrice images averageRating totalReviews category stock isFeatured isActive sku tags')
    .limit(4)
    .lean();

  // Serialize data
  const serializedProduct = JSON.parse(JSON.stringify(product));
  const serializedRelated = JSON.parse(JSON.stringify(relatedProducts));

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
        "name": "PMStore",
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
        "name": serializedProduct.category,
        "item": `${SITE_URL}/products?category=${encodeURIComponent(serializedProduct.category)}`,
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50 py-8">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: product.category, href: `/products?category=${product.category}` },
            { label: product.name, href: '#' },
          ]}
        />

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-6">
          {/* Left: Image Gallery */}
          <ProductImageGallery
            images={serializedProduct.images}
            productName={serializedProduct.name}
            videoUrl={serializedProduct.videoUrl}
          />

          {/* Right: Product Info */}
          <ProductInfo product={serializedProduct} autoOpenReview={review === '1'} />
        </div>

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
            <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
              Related Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
