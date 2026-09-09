import {
  formatComposition,
  savingsVs,
  rankAlternatives,
  type AlternativeCandidate,
  type RankedAlternative,
  type DosageForm,
  type Salt,
} from './composition';

/**
 * View-model for the /compare page: two products side by side, judged on
 * unitPrice — the ONLY number brands may be compared on (CLAUDE.md rule #1).
 *
 * The verdict never names an out-of-stock product best: recommending a
 * medicine nobody can buy helps no one. Savings are reported only when the
 * winner is actually cheaper per unit than the alternative.
 */

export interface CompareProduct {
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
  scheduleClass?: string;
  prescriptionRequired?: boolean;
  compositionKey: string;
  salts: Salt[];
  form: DosageForm;
  /** First product image URL (or null) — for the side-by-side compare thumbnail. */
  image?: string | null;
  /** Optional signals used by the N-way ranking (default 0 when absent). */
  averageRating?: number;
  totalReviews?: number;
  orderCount?: number;
}

export interface CompareVerdict {
  bestId: string;
  /** Savings vs the other product; null when the winner isn't cheaper per unit. */
  savings: ReturnType<typeof savingsVs> | null;
}

export interface CompareViewModel {
  products: CompareProduct[];
  sameComposition: boolean;
  /** Human-readable composition, only when both products share one. */
  compositionLabel: string | null;
  /** null when there is no single winner (both out of stock, or a dead tie). */
  verdict: CompareVerdict | null;
}

export function buildCompareViewModel(products: CompareProduct[]): CompareViewModel {
  if (products.length !== 2) {
    throw new Error('buildCompareViewModel: exactly two products required');
  }

  const [a, b] = products;
  const sameComposition = a.compositionKey === b.compositionKey;

  return {
    products,
    sameComposition,
    compositionLabel: sameComposition ? formatComposition(a.salts) : null,
    verdict: pickBest(a, b),
  };
}

function pickBest(a: CompareProduct, b: CompareProduct): CompareVerdict | null {
  const inStock = [a, b].filter((p) => p.stock > 0);
  if (inStock.length === 0) return null;

  let best: CompareProduct;
  if (inStock.length === 1) {
    best = inStock[0];
  } else if (a.unitPrice !== b.unitPrice) {
    best = a.unitPrice < b.unitPrice ? a : b;
  } else if (a.price !== b.price) {
    best = a.price < b.price ? a : b;
  } else {
    return null; // dead tie — no honest way to call one "best"
  }

  const other = best === a ? b : a;
  const savings =
    best.unitPrice < other.unitPrice ? savingsVs(other.unitPrice, best.unitPrice, best.packSize) : null;

  return { bestId: best._id, savings };
}

// ---------------------------------------------------------------------------
// N-way comparison (3+ brands) — the "Compare all brands" view.
// ---------------------------------------------------------------------------

export interface MultiCompareViewModel {
  /** Every brand, ranked: in-stock first, then cheapest per unit. */
  ranked: RankedAlternative[];
  /** The cheapest in-stock brand (the honest "best value"). */
  cheapestId: string;
  /** The brand the shopper came from — the first id in the URL. */
  searchedId: string;
  sameComposition: boolean;
  /** Human-readable composition, only when every brand shares one. */
  compositionLabel: string | null;
}

function toCandidate(p: CompareProduct): AlternativeCandidate {
  return {
    _id: p._id,
    name: p.name,
    slug: p.slug,
    manufacturer: p.manufacturer,
    price: p.price,
    mrp: p.mrp,
    packSize: p.packSize,
    packUnit: p.packUnit,
    unitPrice: p.unitPrice,
    stock: p.stock,
    averageRating: p.averageRating ?? 0,
    totalReviews: p.totalReviews ?? 0,
    orderCount: p.orderCount ?? 0,
    image: p.image ?? null,
    form: p.form,
  };
}

/**
 * Rank three or more brands for the "Compare all brands" view. The first id is
 * the brand the shopper searched, so savings are reported against it (via
 * `rankAlternatives`), and the cheapest in-stock brand is flagged as the best
 * value — the only number brands may be judged on (CLAUDE.md rule #1).
 */
export function buildMultiCompare(products: CompareProduct[]): MultiCompareViewModel {
  if (products.length < 2) {
    throw new Error('buildMultiCompare: at least two products required');
  }
  const searchedId = products[0]._id;
  const ranked = rankAlternatives(products.map(toCandidate), searchedId);
  const cheapest = ranked.find((r) => r.badges.includes('cheapest'));
  const sameComposition = new Set(products.map((p) => p.compositionKey)).size === 1;

  return {
    ranked,
    cheapestId: cheapest?._id ?? searchedId,
    searchedId,
    sameComposition,
    compositionLabel: sameComposition ? formatComposition(products[0].salts) : null,
  };
}
