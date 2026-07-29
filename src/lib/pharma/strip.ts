/**
 * Strip view-model builder. Pure — no DB, no React.
 *
 * Takes the same-`compositionKey` products (including the current one), ranks
 * them with `rankAlternatives`, and returns the data the Strip renders. Keeping
 * this separate from the component means the Strip's ordering rules — cheapest
 * first, out-of-stock last, `unitPrice` as the headline — are unit-testable
 * without a database.
 */
import {
  rankAlternatives,
  formatComposition,
  type AlternativeCandidate,
  type RankedAlternative,
  type Salt,
  type DosageForm,
} from './composition';

/** A product document as it arrives from the DB (loose — fields may be absent). */
export interface StripProductInput {
  _id: unknown;
  name: string;
  slug: string;
  manufacturer?: string;
  price: number;
  mrp?: number;
  packSize: number;
  packUnit: string;
  unitPrice: number;
  stock?: number;
  averageRating?: number;
  totalReviews?: number;
  orderCount?: number;
  salts?: Salt[];
  form?: DosageForm;
  images?: { url?: string }[];
}

export interface StripViewModel {
  composition: string;
  form: DosageForm | '';
  currentId: string;
  alternatives: RankedAlternative[];
}

function toCandidate(p: StripProductInput): AlternativeCandidate {
  return {
    _id: String((p._id as { toString?: () => string })?.toString?.() ?? p._id),
    name: p.name,
    slug: p.slug,
    manufacturer: p.manufacturer ?? '',
    price: p.price,
    mrp: p.mrp,
    packSize: p.packSize,
    packUnit: p.packUnit,
    unitPrice: p.unitPrice,
    stock: p.stock ?? 0,
    averageRating: p.averageRating ?? 0,
    totalReviews: p.totalReviews ?? 0,
    orderCount: p.orderCount ?? 0,
    image: p.images?.[0]?.url ?? null,
    form: p.form,
  };
}

export function buildStrip(products: StripProductInput[], currentId: string): StripViewModel {
  const id = String(currentId);
  if (!products.length) {
    return { composition: '', form: '', currentId: id, alternatives: [] };
  }

  const candidates = products.map(toCandidate);
  const alternatives = rankAlternatives(candidates, id);

  // Composition/form come from the current product (fall back to the first).
  const current = products.find((p) => String((p._id as { toString?: () => string })?.toString?.() ?? p._id) === id) ?? products[0];

  return {
    composition: current.salts?.length ? formatComposition(current.salts) : '',
    form: current.form ?? '',
    currentId: id,
    alternatives,
  };
}
