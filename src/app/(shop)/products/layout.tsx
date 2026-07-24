import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pmstore.in';

export const metadata: Metadata = {
  title: 'Shop medicines | Pratigya Medical Store',
  description:
    'Order genuine prescription and OTC medicines online from Pratigya Medical Store, Bhopal. Compare brands by price per tablet, find cheaper equivalents of the same composition, and save 60–70% with generic brands. Free home delivery.',
  keywords: [
    'buy medicines online',
    'generic medicines online India',
    'cheaper medicine alternatives',
    'price per tablet comparison',
    'online pharmacy Bhopal',
    'prescription medicines online',
    'Pratigya Medical Store',
    'generic brand medicines',
    'affordable medicines India',
    'order medicine online',
  ],
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
  openGraph: {
    title: 'Shop medicines | Pratigya Medical Store',
    description:
      'Order genuine medicines online. Compare brands by price per tablet, find cheaper equivalents of the same composition, and save with generic brands. Free home delivery.',
    url: `${SITE_URL}/products`,
    type: 'website',
    siteName: 'Pratigya Medical Store',
    images: [
      {
        url: '/images/logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Pratigya Medical Store — Shop medicines',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop medicines | Pratigya Medical Store',
    description:
      'Order genuine medicines online. Compare brands by price per tablet and find cheaper equivalents of the same composition.',
    images: ['/images/logo.jpg'],
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
