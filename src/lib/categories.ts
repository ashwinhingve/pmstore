import {
  Pill,
  Sprout,
  HeartPulse,
  FlaskConical,
  Droplets,
  Soup,
  Wind,
  Leaf,
  Brain,
  Bone,
  Sparkles,
  Stethoscope,
  Syringe,
  PawPrint,
  Microscope,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical pharma category taxonomy — the single source of truth for the
 * storefront's category navigation (desktop dropdown, mobile menu, home
 * section, and the products-page fallback).
 *
 * `name` MUST match the category `name` stored in MongoDB exactly, because the
 * products page filters client-side by name (`catName(p) === selectedCategory`)
 * and category links point at `/products?category=<name>`. Every category here
 * must have at least a few products in the DB, or its tile dead-ends on the
 * empty state; the authoritative list at runtime is `GET /api/categories`.
 *
 * Ayurveda and Homeopathy are seeded with starter products by
 * `scripts/seed-ayurveda-homeopathy.ts` (the shop refines them later), so their
 * names must stay in sync with the Category docs that script creates. Do not add
 * a category here without also seeding products for it — an earlier nav used
 * guessed names ("Heart & BP", "Baby Care") that matched nothing and dead-ended.
 */
/** Decorative tile-tint keys (defined in src/styles/tokens.css, never red). */
export type TintName =
  | "sage" | "sky" | "teal" | "amber" | "violet" | "slate" | "plum" | "clay";

export interface PharmaCategory {
  name: string;
  slug: string;
  icon: LucideIcon;
  /** Tile tint for designed medicine/category cards — see getCategoryTint. */
  tint: TintName;
}

export const PHARMA_CATEGORIES: PharmaCategory[] = [
  // "Medicine" is the top-level door to the whole catalogue. Like Pet Care below
  // it is an intentional exception to the "must have products under this exact
  // name" rule: its tile links to /products (browse-all), not a name filter, so
  // it never dead-ends — see the medicine special case in Categories.tsx.
  { name: "Medicine", slug: "medicine", icon: Pill, tint: "teal" },
  { name: "Ayurveda", slug: "ayurveda", icon: Sprout, tint: "clay" },
  { name: "Cardiac Care", slug: "cardiac-care", icon: HeartPulse, tint: "plum" },
  { name: "Diabetes Care", slug: "diabetes-care", icon: Droplets, tint: "sky" },
  { name: "Homeopathy", slug: "homeopathy", icon: FlaskConical, tint: "slate" },
  { name: "Respiratory & Allergy", slug: "respiratory-allergy", icon: Wind, tint: "teal" },
  { name: "Gastro", slug: "gastro", icon: Soup, tint: "amber" },
  { name: "Vitamins & Supplements", slug: "vitamins-supplements", icon: Leaf, tint: "sage" },
  { name: "Neuro & Psychiatry", slug: "neuro-psychiatry", icon: Brain, tint: "violet" },
  { name: "Ortho & Muscle Care", slug: "ortho-muscle-care", icon: Bone, tint: "slate" },
  { name: "Derma & Skin", slug: "derma-skin", icon: Sparkles, tint: "amber" },
  { name: "General & OTC", slug: "general-otc", icon: Stethoscope, tint: "teal" },
  { name: "Surgical & Medical Supplies", slug: "surgical", icon: Syringe, tint: "sky" },
  // Pet Care is the one intentional exception to the "must have products" rule
  // above: the store wants the tile now but has no pet SKUs yet. Its card links
  // to /custom-order (a request), NOT /products, so it never dead-ends on the
  // empty state — see the pet-care special case in Categories.tsx. When pet
  // products are imported, drop that special case so it filters like the rest.
  { name: "Pet Care", slug: "pet-care", icon: PawPrint, tint: "sage" },
  // Pathology & Nursing Care is a service, not a purchasable product — like Pet
  // Care above, its tile routes to its own info page (not /products), so it
  // never dead-ends on the empty state — see the special case in Categories.tsx.
  { name: "Pathology & Nursing Care", slug: "pathology-nursing-care", icon: Microscope, tint: "sky" },
];

/** Lookup an icon by category name, for lists driven off the DB `/api/categories`. */
const ICON_BY_NAME: Record<string, LucideIcon> = Object.fromEntries(
  PHARMA_CATEGORIES.map((c) => [c.name, c.icon]),
);

export function categoryIcon(name: string): LucideIcon {
  return ICON_BY_NAME[name] ?? Stethoscope;
}
