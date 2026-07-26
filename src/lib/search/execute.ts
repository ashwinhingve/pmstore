/**
 * Search execution layer — the DB-touching half of search.
 *
 * The pure pipeline builders live in `./query`; this module runs them against
 * the Product collection and shapes the response. Kept out of the route handler
 * so `/api/search` and `/api/v1/search` share one implementation (see
 * src/app/api/CLAUDE.md).
 *
 * Atlas Search is the primary path. When the Atlas index isn't reachable (local
 * dev without a cluster, or before the index is built) it falls back to the
 * legacy MongoDB `$text` index so search still works — degraded, no fuzzy or
 * synonyms, but functional.
 */
import mongoose, { type PipelineStage } from 'mongoose';
import Product from '@/models/Product';
import { buildSearchPipeline, buildSuggestPipeline, buildFacetPipeline, sortSpec, type SearchFilters } from './query';
import type { SearchQuery, SearchSuggestQuery } from '@/lib/validations/search';

/**
 * The Atlas `$search`/`$searchMeta` stages aren't part of Mongoose's
 * PipelineStage union, so the builders return plain objects. Narrow to the
 * aggregate() input type at the boundary rather than loosening the builders.
 */
const asPipeline = (stages: Record<string, unknown>[]): PipelineStage[] =>
  stages as unknown as PipelineStage[];

export interface SearchFacets {
  category: { _id: unknown; count: number }[];
  prescriptionRequired: { _id: unknown; count: number }[];
  price: { _id: unknown; count: number }[];
}

export interface SearchResponse {
  data: { results: Record<string, unknown>[]; facets: SearchFacets; degraded: boolean };
  meta: { page: number; limit: number; total: number };
}

const EMPTY_FACETS: SearchFacets = { category: [], prescriptionRequired: [], price: [] };

/**
 * Deep-serialize a Mongoose doc for the Server→Client boundary. Round-tripping
 * through JSON turns every ObjectId — including nested ones like images[]._id
 * and salts[]._id — into a string and yields plain objects, which Client
 * Components require. A shallow copy left those nested ObjectIds intact and
 * crashed ProductCard with "Only plain objects can be passed to Client
 * Components". Mirrors the pattern in src/app/page.tsx.
 */
function serialize<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(doc));
}

function toFilters(params: SearchQuery): SearchFilters {
  return {
    category: params.category ? new mongoose.Types.ObjectId(params.category) : undefined,
    prescriptionRequired: params.prescriptionRequired,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
  };
}

/** Every matched doc lands in exactly one price bucket, so their counts sum to the total. */
function totalFromFacets(facets: SearchFacets): number {
  return facets.price.reduce((sum, b) => sum + (b.count ?? 0), 0);
}

export async function executeSearch(params: SearchQuery): Promise<SearchResponse> {
  const filters = toFilters(params);
  const { q, page, limit, sort } = params;

  try {
    const [results, facetRes] = await Promise.all([
      Product.aggregate(asPipeline(buildSearchPipeline({ q, page, limit, filters, sort }))),
      Product.aggregate(asPipeline(buildFacetPipeline({ q, filters }))),
    ]);
    const facets: SearchFacets = { ...EMPTY_FACETS, ...(facetRes[0] ?? {}) };
    return {
      data: { results: results.map(serialize), facets, degraded: false },
      meta: { page, limit, total: totalFromFacets(facets) },
    };
  } catch {
    // Atlas index unavailable — fall back to the legacy text index.
    return textFallback(params, filters);
  }
}

/** Degraded search over the MongoDB `$text` index — no fuzzy, no synonyms. */
async function textFallback(params: SearchQuery, filters: SearchFilters): Promise<SearchResponse> {
  const { q, page, limit } = params;
  const query: Record<string, unknown> = { isActive: true, isDiscontinued: false, $text: { $search: q } };
  if (filters.category) query.category = filters.category;
  if (filters.prescriptionRequired !== undefined) query.prescriptionRequired = filters.prescriptionRequired;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const price: Record<string, number> = {};
    if (filters.minPrice !== undefined) price.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) price.$lte = filters.maxPrice;
    query.price = price;
  }

  // Honour the sort param; 'relevance' (null spec) keeps the textScore order.
  const explicitSort = sortSpec(params.sort);
  const finder = explicitSort
    ? Product.find(query).sort(explicitSort)
    : Product.find(query, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });

  const [results, total] = await Promise.all([
    finder.skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(query),
  ]);

  return {
    data: { results: (results as Record<string, unknown>[]).map(serialize), facets: EMPTY_FACETS, degraded: true },
    meta: { page, limit, total },
  };
}

export async function executeSuggest(params: SearchSuggestQuery): Promise<{ data: Record<string, unknown>[] }> {
  try {
    const results = await Product.aggregate(asPipeline(buildSuggestPipeline(params)));
    return { data: results.map(serialize) };
  } catch {
    // Fallback: prefix match on name over the text index.
    const results = await Product.find(
      { isActive: true, isDiscontinued: false, name: { $regex: `^${escapeRegex(params.q)}`, $options: 'i' } },
      { name: 1, slug: 1, form: 1, price: 1, unitPrice: 1, packSize: 1, packUnit: 1 }
    )
      .limit(params.limit)
      .lean();
    return { data: (results as Record<string, unknown>[]).map(serialize) };
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
