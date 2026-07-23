import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pmstore.in';

export const metadata: Metadata = {
  title: 'Shop All Products | PMStore',
  description:
    'Browse 100% adulteration-free Indian spices, organic cooking oils, pure desi ghee, premium teas, natural sweeteners, and traditional masalas from PMStore. FSSAI certified. Fast delivery across India.',
  keywords: [
    'buy spices online India',
    'organic spices online',
    'pure desi ghee buy',
    'cooking oil online',
    'buy masala online',
    'PMSTORE shop',
    'adulteration-free food products',
    'PMStore Food and Spices products',
    'natural sweeteners India',
    'premium Indian spices',
  ],
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
  openGraph: {
    title: 'Shop All Products | PMStore',
    description:
      'Browse adulteration-free Indian spices, organic oils, pure ghee, premium teas and natural sweeteners. FSSAI certified. Fast delivery across India.',
    url: `${SITE_URL}/products`,
    type: 'website',
    siteName: 'PMStore (PMSTORE)',
    images: [
      {
        url: '/images/logo.jpg',
        width: 1200,
        height: 630,
        alt: 'PMStore — Shop All Products',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop All Products | PMStore',
    description:
      'Browse adulteration-free Indian spices, organic oils, pure ghee, premium teas and natural sweeteners.',
    images: ['/images/logo.jpg'],
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
