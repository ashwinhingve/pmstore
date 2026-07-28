/**
 * Atlas Search pipeline builders.
 *
 * Pure and DB-free: every function returns a MongoDB aggregation pipeline (an
 * array of stage objects). Nothing here connects, queries, or imports mongoose
 * — the route handler runs the pipeline with `Product.aggregate(...)`. This is
 * what makes the search logic unit-testable without a live Atlas cluster.
 *
 * Query design (docs/04-ROADMAP.md § Week 2, task 6):
 *   compound.should  →  fuzzy text on name (boosted), fuzzy text on salts.name,
 *                        text on manufacturer
 *   compound.filter  →  isActive: true, isDiscontinued: false (+ optional facets)
 */

export const SEARCH_INDEX = 'products_search';
/** Synonym mapping name declared in scripts/atlas-search-index.json. */
export const SYNONYM_MAPPING = 'salt_synonyms';

/** Boosts: a brand-name hit outranks a salt hit, which outranks a manufacturer hit. */
const BOOST_NAME = 3;
const BOOST_SALT = 2;
const BOOST_MANUFACTURER = 1;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const SUGGEST_LIMIT = 8;

/** Price-band facet boundaries in rupees; last band is everything above the top. */
const PRICE_BOUNDARIES = [0, 50, 100, 200, 500, 1000];

export interface SearchFilters {
  /** ObjectId supplied by the route (kept opaque so this module stays DB-free). */
  category?: unknown;
  prescriptionRequired?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

/** Sort options the API accepts (mirrors searchSortEnum in validations/search). */
export type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'unit_price_asc';

export interface SearchParams {
  q: string;
  page?: number;
  limit?: number;
  filters?: SearchFilters;
  sort?: SortKey;
}

/**
 * Explicit sort spec for a non-relevance sort, or null to keep the engine's
 * relevance order (Atlas searchScore / Mongo textScore). Shared by the Atlas
 * pipeline and the $text fallback so both honour the `sort` param.
 */
export function sortSpec(sort: SortKey | undefined): Record<string, 1 | -1> | null {
  switch (sort) {
    case 'price_asc': return { price: 1 };
    case 'price_desc': return { price: -1 };
    case 'unit_price_asc': return { unitPrice: 1 };
    default: return null; // 'relevance' or undefined
  }
}

export interface SuggestParams {
  q: string;
  limit?: number;
}

/**
 * Fuzzy tolerance sized to a term's length. One edit is plenty for a 4-letter
 * word; longer words earn a second edit. Terms of 1–2 characters get no fuzzy —
 * at that length every word is one edit from every other and results turn to noise.
 */
export function fuzzyForTerm(term: string): { maxEdits: number } | null {
  const len = term.length;
  if (len <= 2) return null;
  if (len <= 4) return { maxEdits: 1 };
  return { maxEdits: 2 };
}

/** Pick the fuzzy config for a whole query from its longest alphabetic word. */
function fuzzyForQuery(q: string): { maxEdits: number } | null {
  const words = q.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  if (!words.length) return null;
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
  return fuzzyForTerm(longest);
}

function clampLimit(limit: number | undefined, fallback: number, max: number): number {
  if (!limit || limit < 1) return fallback;
  return Math.min(Math.floor(limit), max);
}

/** The active/non-discontinued filter every search shares. */
function baseFilters(filters: SearchFilters = {}): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [
    { equals: { path: 'isActive', value: true } },
    { equals: { path: 'isDiscontinued', value: false } },
  ];

  if (filters.category !== undefined) {
    out.push({ equals: { path: 'category', value: filters.category } });
  }
  if (filters.prescriptionRequired !== undefined) {
    out.push({ equals: { path: 'prescriptionRequired', value: filters.prescriptionRequired } });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const range: Record<string, unknown> = { path: 'price' };
    if (filters.minPrice !== undefined) range.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) range.lte = filters.maxPrice;
    out.push({ range });
  }

  return out;
}

/**
 * The scoring `should` clauses shared by full search and facet counting.
 *
 * Note the two salts.name clauses: Atlas rejects `fuzzy` and `synonyms` in one
 * text operator, so typo tolerance ("paracetmol") and alias expansion
 * ("acetaminophen" → paracetamol) each need their own clause.
 */
function shouldClauses(q: string) {
  const fuzzy = fuzzyForQuery(q);
  const fuzzyPart = fuzzy ? { fuzzy } : {};
  return [
    { text: { query: q, path: 'name', score: { boost: { value: BOOST_NAME } }, ...fuzzyPart } },
    { text: { query: q, path: 'salts.name', score: { boost: { value: BOOST_SALT } }, ...fuzzyPart } },
    {
      text: {
        query: q,
        path: 'salts.name',
        synonyms: SYNONYM_MAPPING,
        score: { boost: { value: BOOST_SALT } },
      },
    },
    { text: { query: q, path: 'manufacturer', score: { boost: { value: BOOST_MANUFACTURER } } } },
  ];
}

/** Fields a product card needs — keep the payload lean. */
const CARD_PROJECTION = {
  name: 1,
  slug: 1,
  manufacturer: 1,
  form: 1,
  salts: 1,
  price: 1,
  mrp: 1,
  packSize: 1,
  packUnit: 1,
  unitPrice: 1,
  stock: 1,
  prescriptionRequired: 1,
  scheduleClass: 1,
  compositionKey: 1,
  images: 1,
  averageRating: 1,
  totalReviews: 1,
  score: { $meta: 'searchScore' },
} as const;

export function buildSearchPipeline(params: SearchParams): Record<string, unknown>[] {
  const { q, filters } = params;
  const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
  const limit = clampLimit(params.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const sort = sortSpec(params.sort);

  return [
    {
      $search: {
        index: SEARCH_INDEX,
        compound: {
          should: shouldClauses(q),
          filter: baseFilters(filters),
          minimumShouldMatch: 1,
        },
      },
    },
    // A non-relevance sort overrides Atlas score order; omit for 'relevance'.
    ...(sort ? [{ $sort: sort }] : []),
    { $skip: (page - 1) * limit },
    { $limit: limit },
    { $project: CARD_PROJECTION },
  ];
}

export function buildSuggestPipeline(params: SuggestParams): Record<string, unknown>[] {
  const { q } = params;
  const limit = clampLimit(params.limit, SUGGEST_LIMIT, SUGGEST_LIMIT);
  const fuzzy = fuzzyForQuery(q);
  const fuzzyPart = fuzzy ? { fuzzy } : {};

  return [
    {
      // Prefix-match the brand name (autocomplete) AND token-match the salt, so
      // typing a composition like "paracetamol" surfaces the brands that carry
      // it — not just brands whose name starts with those letters. Brand-name
      // hits outrank salt hits via the boosts. A separate synonyms clause covers
      // aliases (Atlas bars fuzzy + synonyms in one operator).
      $search: {
        index: SEARCH_INDEX,
        compound: {
          should: [
            {
              autocomplete: {
                query: q,
                path: 'name',
                score: { boost: { value: BOOST_NAME } },
                ...fuzzyPart,
              },
            },
            {
              text: {
                query: q,
                path: 'salts.name',
                score: { boost: { value: BOOST_SALT } },
                ...fuzzyPart,
              },
            },
            {
              text: {
                query: q,
                path: 'salts.name',
                synonyms: SYNONYM_MAPPING,
                score: { boost: { value: BOOST_SALT } },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    // Post-filter: gate visibility here (kept out of compound.filter so the
    // shape matches the fallback's expectations and stays easy to reason about).
    { $match: { isActive: true, isDiscontinued: false } },
    { $limit: limit },
    {
      $project: {
        name: 1,
        slug: 1,
        form: 1,
        price: 1,
        unitPrice: 1,
        packSize: 1,
        packUnit: 1,
      },
    },
  ];
}

/**
 * Facet counts for the results sidebar: category, prescriptionRequired and
 * price band. Atlas `$searchMeta` faceting can't natively bucket an ObjectId
 * `category` field, so we run the same `$search` and count with Mongo's native
 * `$facet`/`$bucket` instead — no schema change, all three dimensions delivered.
 */
export function buildFacetPipeline(params: SearchParams): Record<string, unknown>[] {
  const { q, filters } = params;
  return [
    {
      $search: {
        index: SEARCH_INDEX,
        compound: {
          should: shouldClauses(q),
          filter: baseFilters(filters),
          minimumShouldMatch: 1,
        },
      },
    },
    {
      $facet: {
        category: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        prescriptionRequired: [{ $group: { _id: '$prescriptionRequired', count: { $sum: 1 } } }],
        price: [
          {
            $bucket: {
              groupBy: '$price',
              boundaries: PRICE_BOUNDARIES,
              default: 'over',
              output: { count: { $sum: 1 } },
            },
          },
        ],
      },
    },
  ];
}
