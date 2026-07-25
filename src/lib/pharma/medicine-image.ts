/**
 * Fallback product imagery, keyed by dosage form.
 *
 * The catalogue was imported from a handwritten register and most products
 * have no uploaded photo yet. Rather than show a blank icon, we display a real,
 * representative photo of that dosage form (a strip of tablets, a syrup bottle,
 * a dropper, …) so every medicine reads as a real product. These are generic
 * stock photos — not the exact pack — so any surface that leans on them for a
 * product with no real image should say "representative image" for honesty.
 *
 * Files live in /public/medicine (self-hosted for reliability, no runtime
 * dependency on a third-party host). Photos are from Pexels — free for
 * commercial use, no attribution required (see public/medicine/CREDITS.txt).
 */

import type { DosageForm } from './composition';

const FALLBACK_IMAGE = '/medicine/generic.jpg';

const FORM_IMAGE: Record<DosageForm, string> = {
  tablet: '/medicine/tablet.jpg',
  capsule: '/medicine/capsule.jpg',
  syrup: '/medicine/syrup.jpg',
  suspension: '/medicine/syrup.jpg',
  injection: '/medicine/injection.jpg',
  cream: '/medicine/cream.jpg',
  ointment: '/medicine/cream.jpg',
  gel: '/medicine/cream.jpg',
  drops: '/medicine/drops.jpg',
  inhaler: '/medicine/inhaler.jpg',
  spray: '/medicine/inhaler.jpg',
  powder: FALLBACK_IMAGE,
  sachet: FALLBACK_IMAGE,
  patch: FALLBACK_IMAGE,
  other: FALLBACK_IMAGE,
};

/**
 * Real, representative photo for a dosage form. Tolerates an unknown/missing
 * form (search projections or legacy rows) and falls back to a neutral shot.
 */
export function getMedicineImage(form?: string | null): string {
  if (form && form in FORM_IMAGE) return FORM_IMAGE[form as DosageForm];
  return FALLBACK_IMAGE;
}

/**
 * True for the auto-generated SVG placeholders (scripts/generate-product-images.ts),
 * which carry a `placeholder-` Cloudinary public id. We treat these as "no photo"
 * so a real representative photo shows instead. Genuine uploads and CSV-imported
 * photos are left untouched.
 */
export function isPlaceholderImage(url?: string | null): boolean {
  return !!url && url.includes('/placeholder-');
}

/**
 * Best product image for a listing/card: a real uploaded photo when there is
 * one, otherwise a representative photo of the dosage form.
 */
export function resolveProductImage(
  imageUrl: string | null | undefined,
  form?: string | null
): string {
  if (imageUrl && !isPlaceholderImage(imageUrl)) return imageUrl;
  return getMedicineImage(form);
}
