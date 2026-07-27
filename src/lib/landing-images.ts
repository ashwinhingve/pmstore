/**
 * Curated marketing imagery for the landing page.
 *
 * Hosts are limited to `images.unsplash.com` and `images.pexels.com` — the only
 * external image hosts whitelisted in `next.config.js` (CSP `img-src https:`
 * also permits them). Every URL here was verified to return HTTP 200 before it
 * shipped; a broken image is worse than none.
 *
 * All Unsplash photos are royalty-free for commercial use, no attribution
 * required (Unsplash License). Sizes are baked into the query string per use
 * (hero ~1920px, banner ~1600px, category ~800px, testimonial ~400px). This is
 * the single place to swap the landing photography — no component changes needed.
 */

export interface LandingImage {
  url: string;
  /** Truthful, concise alt text (5–10 words). Empty string = decorative. */
  alt: string;
}

/** Hero slider backgrounds (full-bleed). */
export const HERO_IMAGES: LandingImage[] = [
  {
    url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=1920&q=80',
    alt: 'Well-stocked pharmacy shelves',
  },
  {
    url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1920&q=80',
    alt: 'Pharmacist assisting a customer',
  },
  {
    url: 'https://images.unsplash.com/photo-1580281657527-47f249e8f4df?auto=format&fit=crop&w=1920&q=80',
    alt: 'Healthcare worker holding a medicine box',
  },
  {
    url: 'https://images.unsplash.com/photo-1625690987114-86f5af994b49?auto=format&fit=crop&w=1920&q=80',
    alt: 'Couple enjoying good health together',
  },
  {
    url: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=1920&q=80',
    alt: 'Colourful capsules spilling from a bottle',
  },
];

/**
 * Category card images, keyed by the category `slug` from src/lib/categories.ts.
 * A missing slug is fine — Categories.tsx falls back to a tinted card.
 */
export const CATEGORY_IMAGES: Record<string, LandingImage> = {
  'pain-relief': {
    url: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=800&q=80',
    alt: 'Assorted pain-relief tablets',
  },
  'cardiac-care': {
    url: 'https://images.unsplash.com/photo-1690787628851-d36e285c29b0?auto=format&fit=crop&w=800&q=80',
    alt: 'Stethoscope with a red heart',
  },
  'diabetes-care': {
    url: 'https://images.unsplash.com/photo-1685485276223-0bb0226dcca8?auto=format&fit=crop&w=800&q=80',
    alt: 'Checking blood sugar with a glucose meter',
  },
  'antibiotics': {
    url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
    alt: 'Orange and white medicine capsules',
  },
  'respiratory-allergy': {
    url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
    alt: 'Stethoscope for respiratory care',
  },
  'gastro': {
    url: 'https://images.unsplash.com/photo-1576602975754-efdf313b9342?auto=format&fit=crop&w=800&q=80',
    alt: 'Digestive-care medicines',
  },
  'vitamins-supplements': {
    url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80',
    alt: 'Multicoloured vitamin capsules',
  },
  'neuro-psychiatry': {
    url: 'https://images.unsplash.com/photo-1526724038726-3007ffb8025f?auto=format&fit=crop&w=800&q=80',
    alt: 'Woman meditating by the sea',
  },
  'ortho-muscle-care': {
    url: 'https://images.unsplash.com/photo-1778826393424-2e063bf5fd64?auto=format&fit=crop&w=800&q=80',
    alt: 'Person holding a sore knee',
  },
  'derma-skin': {
    url: 'https://images.unsplash.com/photo-1730288951113-9cc087c14b83?auto=format&fit=crop&w=800&q=80',
    alt: 'Woman with healthy, glowing skin',
  },
  'general-otc': {
    url: 'https://images.unsplash.com/photo-1562243061-204550d8a2c9?auto=format&fit=crop&w=800&q=80',
    alt: 'Prescription bottle with capsules',
  },
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
    url: 'https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?auto=format&fit=crop&w=1600&q=80',
    alt: 'Healthcare worker with a prescription',
    eyebrow: 'Prescription orders',
    title: 'Upload your prescription',
    body: 'Send a photo and a pharmacist builds your order. Schedule-H medicines are verified before dispatch.',
    ctaText: 'Upload prescription',
    ctaHref: '/prescriptions',
  },
  {
    url: 'https://images.unsplash.com/photo-1758691031621-f6870f9f998a?auto=format&fit=crop&w=1600&q=80',
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
  {
    url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=80',
    alt: 'Pharmacist at the counter',
  },
  {
    url: 'https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&w=1200&q=80',
    alt: 'Precise quality check in a lab',
  },
  {
    url: 'https://images.unsplash.com/photo-1559234938-b60fff04894d?auto=format&fit=crop&w=1200&q=80',
    alt: 'Couple walking outdoors',
  },
];

/** Testimonial avatar portraits (~400px square). */
export const TESTIMONIAL_IMAGES: LandingImage[] = [
  {
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    alt: 'Customer portrait',
  },
  {
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    alt: 'Customer portrait',
  },
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    alt: 'Customer portrait',
  },
];
