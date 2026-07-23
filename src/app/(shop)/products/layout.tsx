import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://taptifs.in';

export const metadata: Metadata = {
  title: 'Shop All Products | Tapti Food & Spices',
  description:
    'Browse 100% adulteration-free Indian spices, organic cooking oils, pure desi ghee, premium teas, natural sweeteners, and traditional masalas from Tapti Food & Spices. FSSAI certified. Fast delivery across India.',
  keywords: [
    'buy spices online India',
    'organic spices online',
    'pure desi ghee buy',
    'cooking oil online',
    'buy masala online',
    'TAPTIFS shop',
    'adulteration-free food products',
    'Tapti Food and Spices products',
    'natural sweeteners India',
    'premium Indian spices',
  ],
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
  openGraph: {
    title: 'Shop All Products | Tapti Food & Spices',
    description:
      'Browse adulteration-free Indian spices, organic oils, pure ghee, premium teas and natural sweeteners. FSSAI certified. Fast delivery across India.',
    url: `${SITE_URL}/products`,
    type: 'website',
    siteName: 'Tapti Food & Spices (TAPTIFS)',
    images: [
      {
        url: '/images/logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Tapti Food & Spices — Shop All Products',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop All Products | Tapti Food & Spices',
    description:
      'Browse adulteration-free Indian spices, organic oils, pure ghee, premium teas and natural sweeteners.',
    images: ['/images/logo.jpg'],
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
