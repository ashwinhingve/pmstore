import {
  Pill,
  HeartPulse,
  ShieldPlus,
  Droplets,
  Soup,
  Wind,
  Leaf,
  Brain,
  Bone,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical pharma category taxonomy — the single source of truth for the
 * storefront's category navigation (desktop dropdown, mobile menu, home
 * section, and the products-page fallback).
 *
 * `name` MUST match the category `name` stored in MongoDB exactly, because the
 * products page filters client-side by name (`catName(p) === selectedCategory`)
 * and category links point at `/products?category=<name>`. These are the 11
 * categories that actually have imported products (verified against the DB);
 * the authoritative list at runtime is `GET /api/categories`. Do not add a
 * category here that has no products — the link would dead-end on the empty
 * state (the exact bug this file was created to fix).
 *
 * A previous version of the nav used guessed names ("Heart & BP", "Baby Care",
 * "Ayurveda") that matched no products — every category link dead-ended on the
 * empty state. Keep this list aligned with the DB.
 */
export interface PharmaCategory {
  name: string;
  slug: string;
  icon: LucideIcon;
}

export const PHARMA_CATEGORIES: PharmaCategory[] = [
  { name: "Pain Relief", slug: "pain-relief", icon: Pill },
  { name: "Cardiac Care", slug: "cardiac-care", icon: HeartPulse },
  { name: "Diabetes Care", slug: "diabetes-care", icon: Droplets },
  { name: "Antibiotics", slug: "antibiotics", icon: ShieldPlus },
  { name: "Respiratory & Allergy", slug: "respiratory-allergy", icon: Wind },
  { name: "Gastro", slug: "gastro", icon: Soup },
  { name: "Vitamins & Supplements", slug: "vitamins-supplements", icon: Leaf },
  { name: "Neuro & Psychiatry", slug: "neuro-psychiatry", icon: Brain },
  { name: "Ortho & Muscle Care", slug: "ortho-muscle-care", icon: Bone },
  { name: "Derma & Skin", slug: "derma-skin", icon: Sparkles },
  { name: "General & OTC", slug: "general-otc", icon: Stethoscope },
];

/** Lookup an icon by category name, for lists driven off the DB `/api/categories`. */
const ICON_BY_NAME: Record<string, LucideIcon> = Object.fromEntries(
  PHARMA_CATEGORIES.map((c) => [c.name, c.icon]),
);

export function categoryIcon(name: string): LucideIcon {
  return ICON_BY_NAME[name] ?? Stethoscope;
}
