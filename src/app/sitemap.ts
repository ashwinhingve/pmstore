import { MetadataRoute } from 'next';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import Category from '@/models/Category';

export const revalidate = 86400; // refresh sitemap every 24 hours

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pmstore.in';

const staticPages: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: `${SITE_URL}/products`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/about`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/contact`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/wholesale`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    await connectDB();

    const [products, categories] = await Promise.all([
      Product.find({ isActive: true })
        .select('slug updatedAt')
        .sort({ updatedAt: -1 })
        .lean(),
      Category.find({ isActive: true })
        .select('name updatedAt')
        .lean(),
    ]);

    const productUrls: MetadataRoute.Sitemap = (products as any[]).map((product) => ({
      url: `${SITE_URL}/products/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const categoryUrls: MetadataRoute.Sitemap = (categories as any[]).map((cat) => ({
      url: `${SITE_URL}/products?category=${encodeURIComponent(cat.name)}`,
      lastModified: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticPages, ...productUrls, ...categoryUrls];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}
