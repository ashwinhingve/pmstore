import {
  Pill,
  Tablets,
  Syringe,
  Droplet,
  FlaskConical,
  Wind,
  SprayCan,
  Package,
  Bandage,
  type LucideIcon,
} from "lucide-react";
import { PHARMA_CATEGORIES, type TintName } from "@/lib/categories";

/**
 * Visual identity for a medicine when there is no real pack photo. Instead of
 * repeating one stock photo per dosage form (which made every tablet look
 * identical), we render a designed tile: a soft category tint + the dosage-form
 * glyph. This makes every card read as distinct and intentional. See
 * src/components/products/ProductVisual.tsx.
 */

export interface Tint {
  /** Soft background — a `var(--tint-*-soft)` token. Applied via inline style. */
  bg: string;
  /** Accent for the glyph — a `var(--tint-*)` token. */
  fg: string;
}

const TINT_ORDER: TintName[] = [
  "sage", "sky", "teal", "amber", "violet", "slate", "plum", "clay",
];

function tintVars(name: TintName): Tint {
  return { bg: `var(--tint-${name}-soft)`, fg: `var(--tint-${name})` };
}

const TINT_BY_CATEGORY: Record<string, TintName> = Object.fromEntries(
  PHARMA_CATEGORIES.map((c) => [c.name, c.tint]),
);

/** Stable non-negative hash so an unknown category still gets a consistent tint. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * The tile tint for a category. Canonical categories carry their own tint;
 * anything else (a DB category not in the taxonomy) hashes to a stable one.
 */
export function getCategoryTint(category?: string | null): Tint {
  const name = (category || "").trim();
  const key = TINT_BY_CATEGORY[name] ?? TINT_ORDER[hash(name) % TINT_ORDER.length];
  return tintVars(key);
}

const FORM_GLYPH: Record<string, LucideIcon> = {
  tablet: Tablets,
  capsule: Pill,
  syrup: FlaskConical,
  suspension: FlaskConical,
  injection: Syringe,
  cream: Bandage,
  ointment: Bandage,
  gel: Bandage,
  patch: Bandage,
  drops: Droplet,
  inhaler: Wind,
  spray: SprayCan,
  powder: Package,
  sachet: Package,
};

/** The dosage-form glyph for a designed medicine tile. Falls back to a pill. */
export function getFormGlyph(form?: string | null): LucideIcon {
  const key = (form || "").toLowerCase();
  return FORM_GLYPH[key] ?? Pill;
}
