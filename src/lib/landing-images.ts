/**
 * Curated marketing imagery for the landing page.
 *
 * Served locally from `public/landing/` (not hotlinked) — download them with
 * `npx tsx scripts/fetch-landing-images.ts`. Local files are optimized by
 * next/image and never blank out from third-party throttling, which matters
 * because the Capacitor app is a WebView of this exact site.
 *
 * All photos are Unsplash-licence (royalty-free, commercial, no attribution
 * required). This is the single place to swap the landing photography — update
 * a path here and, if the source changes, the mapping in the fetch script.
 */

export interface LandingImage {
  url: string;
  /** Truthful, concise alt text (5–10 words). Empty string = decorative. */
  alt: string;
}

/** Hero slider backgrounds (full-bleed). */
export const HERO_IMAGES: LandingImage[] = [
  { url: '/landing/hero-1.jpg', alt: 'Well-stocked pharmacy shelves' },
  { url: '/landing/hero-2.jpg', alt: 'Pharmacist assisting a customer' },
  { url: '/landing/hero-3.jpg', alt: 'Healthcare worker holding a medicine box' },
  { url: '/landing/hero-4.jpg', alt: 'Couple enjoying good health together' },
  { url: '/landing/hero-5.jpg', alt: 'Colourful capsules spilling from a bottle' },
];

/**
 * Category card images, keyed by the category `slug` from src/lib/categories.ts.
 * A missing slug is fine — Categories.tsx falls back to a tinted card.
 */
export const CATEGORY_IMAGES: Record<string, LandingImage> = {
  'pain-relief': { url: '/landing/category-pain-relief.jpg', alt: 'Assorted pain-relief tablets' },
  'cardiac-care': { url: '/landing/category-cardiac-care.jpg', alt: 'Stethoscope with a red heart' },
  'diabetes-care': { url: '/landing/category-diabetes-care.jpg', alt: 'Checking blood sugar with a glucose meter' },
  'antibiotics': { url: '/landing/category-antibiotics.jpg', alt: 'Orange and white medicine capsules' },
  'respiratory-allergy': { url: '/landing/category-respiratory-allergy.jpg', alt: 'Stethoscope for respiratory care' },
  'gastro': { url: '/landing/category-gastro.jpg', alt: 'Digestive-care medicines' },
  'vitamins-supplements': { url: '/landing/category-vitamins-supplements.jpg', alt: 'Multicoloured vitamin capsules' },
  'neuro-psychiatry': { url: '/landing/category-neuro-psychiatry.jpg', alt: 'Woman meditating by the sea' },
  'ortho-muscle-care': { url: '/landing/category-ortho-muscle-care.jpg', alt: 'Person holding a sore knee' },
  'derma-skin': { url: '/landing/category-derma-skin.jpg', alt: 'Woman with healthy, glowing skin' },
  'general-otc': { url: '/landing/category-general-otc.jpg', alt: 'Prescription bottle with capsules' },
  'pet-care': { url: '/landing/category-pet-care.jpg', alt: 'A cat and dog resting together outdoors' },
};

/** Feature promo banners (wide). CTAs point at real features only. */
export interface PromoBanner extends LandingImage {
  eyebrow: string;
  title: string;
  body: string;
  ctaText: string;
  ctaHref: string;
}

export const PROMO_BANNERS: PromoBanner[] = [
  {
    url: '/landing/promo-rx.jpg',
    alt: 'Healthcare worker with a prescription',
    eyebrow: 'Prescription orders',
    title: 'Upload your prescription',
    body: 'Send a photo and a pharmacist builds your order. Schedule-H medicines are verified before dispatch.',
    ctaText: 'Upload prescription',
    ctaHref: '/prescriptions',
  },
  {
    url: '/landing/promo-reorder.jpg',
    alt: 'Person happily opening a delivery box',
    eyebrow: 'Refills made easy',
    title: 'Reorder in one tap',
    body: 'Your regular medicines saved for next time, with reminders before you run out.',
    ctaText: 'View your orders',
    ctaHref: '/orders',
  },
];

/** Trust / lifestyle supporting images. */
export const TRUST_IMAGES: LandingImage[] = [
  { url: '/landing/trust-1.jpg', alt: 'Pharmacist at the counter' },
  { url: '/landing/trust-2.jpg', alt: 'Precise quality check in a lab' },
  { url: '/landing/trust-3.jpg', alt: 'Couple walking outdoors' },
];
