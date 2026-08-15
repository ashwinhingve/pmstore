import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Shop medicines | PM Store',
  description:
    'Order prescription and OTC medicines online from PM Store, Bhopal. Compare brands by price per tablet, find cheaper equivalents of the same composition, and save 60–70% with generic brands. Free home delivery.',
  keywords: [
    'buy medicines online',
    'generic medicines online India',
    'cheaper medicine alternatives',
    'price per tablet comparison',
    'online pharmacy Bhopal',
    'prescription medicines online',
    'PM Store',
    'PM Store medicine Bhopal',
    'generic brand medicines',
    'affordable medicines India',
    'order medicine online',
  ],
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
  openGraph: {
    title: 'Shop medicines | PM Store',
    description:
      'Order medicines online. Compare brands by price per tablet, find cheaper equivalents of the same composition, and save with generic brands. Free home delivery.',
    url: `${SITE_URL}/products`,
    type: 'website',
    siteName: 'PM Store',
    images: [
      {
        url: '/images/logo.jpg',
        width: 1200,
        height: 630,
        alt: 'PM Store — Shop medicines',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop medicines | PM Store',
    description:
      'Order medicines online. Compare brands by price per tablet and find cheaper equivalents of the same composition.',
    images: ['/images/logo.jpg'],
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
