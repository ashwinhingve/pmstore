import {
  formatComposition,
  savingsVs,
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
