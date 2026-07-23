/**
 * Composition logic — the foundation of formula search, price comparison
 * and alternative suggestions.
 *
 * Everything hinges on `compositionKey`: a deterministic, normalized string
 * that is identical for any two products with the same salts, strengths and
 * dosage form. Group by it and all three features are one indexed query.
 */

export type SaltUnit = 'mg' | 'mcg' | 'g' | 'ml' | 'iu' | '%';

export type DosageForm =
  | 'tablet' | 'capsule' | 'syrup' | 'suspension' | 'injection'
  | 'cream' | 'ointment' | 'gel' | 'drops' | 'inhaler'
  | 'powder' | 'sachet' | 'spray' | 'patch' | 'other';

export interface Salt {
  name: string;
  strength: number;
  unit: SaltUnit;
}

/**
 * Alternate spellings and international names that must collapse to one salt.
 * Extend this as the catalogue grows — it is also the source for the
 * Atlas Search synonym mapping (see scripts/build-search-synonyms.ts).
 */
export const SALT_ALIASES: Record<string, string> = {
  acetaminophen: 'paracetamol',
  paracetmol: 'paracetamol',
  'vitamin c': 'ascorbic acid',
  'vitamin b12': 'cyanocobalamin',
  'vitamin d3': 'cholecalciferol',
  salbutamol: 'albuterol',
  frusemide: 'furosemide',
  rifampin: 'rifampicin',
  cotrimoxazole: 'sulfamethoxazole + trimethoprim',
  'b complex': 'vitamin b complex',
};

/** Strip salt/ester suffixes that don't change therapeutic equivalence. */
const SALT_FORM_SUFFIXES = [
  'hydrochloride', 'hcl', 'sodium', 'potassium', 'calcium', 'magnesium',
  'sulphate', 'sulfate', 'phosphate', 'maleate', 'tartrate', 'succinate',
  'besylate', 'mesylate', 'fumarate', 'citrate', 'acetate', 'dihydrate',
  'monohydrate', 'trihydrate', 'anhydrous',
];

/** Dosage forms that are clinically interchangeable for comparison purposes. */
const FORM_EQUIVALENCE: Partial<Record<DosageForm, DosageForm>> = {
  capsule: 'tablet',
  suspension: 'syrup',
  ointment: 'cream',
};

export function normalizeSaltName(raw: string): string {
  let name = raw
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')          // drop parenthetical notes
    .replace(/[^a-z0-9+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (SALT_ALIASES[name]) return SALT_ALIASES[name];

  // Remove trailing salt-form words: "amlodipine besylate" -> "amlodipine"
  const words = name.split(' ');
  while (words.length > 1 && SALT_FORM_SUFFIXES.includes(words[words.length - 1])) {
    words.pop();
  }
  name = words.join(' ');

  return SALT_ALIASES[name] ?? name;
}

/** Convert to a canonical unit so 500 mcg and 0.5 mg group together. */
function canonicalStrength(strength: number, unit: SaltUnit): { value: number; unit: string } {
  switch (unit) {
    case 'mcg': return { value: strength / 1000, unit: 'mg' };
    case 'g':   return { value: strength * 1000, unit: 'mg' };
    default:    return { value: strength, unit };
  }
}

export function normalizeForm(form: DosageForm): DosageForm {
  return FORM_EQUIVALENCE[form] ?? form;
}

/**
 * Build the grouping key.
 *
 *   [{ name: 'Paracetamol', strength: 650, unit: 'mg' }], 'tablet'
 *     -> 'paracetamol-650mg|tablet'
 *
 * Salts are sorted so ingredient order in the source data doesn't matter:
 * "Amoxicillin + Clavulanic Acid" and "Clavulanic Acid + Amoxicillin"
 * produce the same key.
 */
export function buildCompositionKey(salts: Salt[], form: DosageForm): string {
  if (!salts?.length) throw new Error('buildCompositionKey: at least one salt required');

  const parts = salts
    .map((s) => {
      const { value, unit } = canonicalStrength(s.strength, s.unit);
      const strength = Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '');
      return `${normalizeSaltName(s.name)}-${strength}${unit}`;
    })
    .sort();

  return `${parts.join('+')}|${normalizeForm(form)}`;
}

/** Human-readable label: "Paracetamol 650 mg" */
export function formatComposition(salts: Salt[]): string {
  return salts
    .map((s) => `${titleCase(normalizeSaltName(s.name))} ${s.strength} ${s.unit}`)
    .join(' + ');
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Price per tablet / ml / unit. This is the ONLY number the UI should use
 * when comparing brands — a ₹28 strip of 15 costs more per tablet than a
 * ₹52 strip of 30, and showing headline prices side by side misleads people.
 */
export function computeUnitPrice(price: number, packSize: number): number {
  if (!packSize || packSize <= 0) return price;
  return Math.round((price / packSize) * 100) / 100;
}

export function savingsVs(currentUnitPrice: number, altUnitPrice: number, packSize: number) {
  const perUnit = currentUnitPrice - altUnitPrice;
  return {
    perUnit: Math.round(perUnit * 100) / 100,
    perPack: Math.round(perUnit * packSize * 100) / 100,
    percent: currentUnitPrice > 0 ? Math.round((perUnit / currentUnitPrice) * 100) : 0,
  };
}

// ---------------------------------------------------------------------------
// Alternative ranking
// ---------------------------------------------------------------------------

export interface AlternativeCandidate {
  _id: string;
  name: string;
  slug: string;
  manufacturer: string;
  price: number;
  mrp?: number;
  packSize: number;
  packUnit: string;
  unitPrice: number;
  stock: number;
  averageRating: number;
  totalReviews: number;
  orderCount?: number;
}

export type AlternativeBadge = 'cheapest' | 'best-rated' | 'most-popular' | 'current';

export interface RankedAlternative extends AlternativeCandidate {
  badges: AlternativeBadge[];
  savings: ReturnType<typeof savingsVs> | null;
}

/** A brand needs this many reviews before "best rated" means anything. */
const MIN_REVIEWS_FOR_RATING_BADGE = 5;

/**
 * Rank same-composition products for the Strip component.
 * Out-of-stock items are kept but sorted last — seeing that a cheaper option
 * exists but is unavailable is still useful information.
 */
export function rankAlternatives(
  candidates: AlternativeCandidate[],
  currentId: string
): RankedAlternative[] {
  if (!candidates.length) return [];

  const current = candidates.find((c) => c._id === currentId);
  const inStock = candidates.filter((c) => c.stock > 0);
  const pool = inStock.length ? inStock : candidates;

  const cheapest = pool.reduce((a, b) => (b.unitPrice < a.unitPrice ? b : a));

  const rateable = pool.filter((c) => c.totalReviews >= MIN_REVIEWS_FOR_RATING_BADGE);
  const bestRated = rateable.length
    ? rateable.reduce((a, b) => (b.averageRating > a.averageRating ? b : a))
    : null;

  const popular = pool.filter((c) => (c.orderCount ?? 0) > 0);
  const mostPopular = popular.length
    ? popular.reduce((a, b) => ((b.orderCount ?? 0) > (a.orderCount ?? 0) ? b : a))
    : null;

  return candidates
    .map((c) => {
      const badges: AlternativeBadge[] = [];
      if (c._id === currentId) badges.push('current');
      if (c._id === cheapest._id) badges.push('cheapest');
      if (bestRated && c._id === bestRated._id) badges.push('best-rated');
      if (mostPopular && c._id === mostPopular._id) badges.push('most-popular');

      const savings =
        current && c._id !== currentId && c.unitPrice < current.unitPrice
          ? savingsVs(current.unitPrice, c.unitPrice, c.packSize)
          : null;

      return { ...c, badges, savings };
    })
    .sort((a, b) => {
      if (a.stock > 0 !== b.stock > 0) return a.stock > 0 ? -1 : 1;
      return a.unitPrice - b.unitPrice;
    });
}
