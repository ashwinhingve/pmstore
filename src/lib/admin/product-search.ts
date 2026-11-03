/**
 * Admin product-list search.
 *
 * The admin catalogue search used to regex only name/sku/description and so
 * missed products an admin would reasonably look up by manufacturer, salt, tag
 * or category. This builds a tokenised filter: the query is split on whitespace
 * and every token must match SOMEWHERE (AND across tokens, OR across fields), so
 * "dolo 650" finds "Dolo 650 Tablet" and a single word still matches broadly.
 *
 * Pure (`buildProductSearchFilter`) so it is unit-testable without a database;
 * `buildAdminProductQuery` adds the tiny category-name lookup for callers.
 */
import Category from '@/models/Category';

/** Text fields a token may match. `manufacturer`, `salts.name` and `tags` are
 *  included here (admin), unlike the storefront where manufacturer is a low
 *  tier — an admin genuinely searches by company and molecule. */
const SEARCH_FIELDS = [
  'name',
  'sku',
  'description',
  'manufacturer',
  'salts.name',
  'tags',
] as const;

/** Escape regex metacharacters so a query like "vitamin c (500)" is literal. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the Mongo filter for a search string. Returns `null` for an empty query
 * (caller should not add a search clause). `categoryIds` are category ObjectIds
 * whose name matched the query — passed so a token can also match by category.
 */
export function buildProductSearchFilter(
  search: string,
  categoryIds: string[] = [],
): Record<string, unknown> | null {
  const tokens = (search ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const clauses = tokens.map((token) => {
    const rx = { $regex: escapeRegex(token), $options: 'i' };
    const or: Record<string, unknown>[] = SEARCH_FIELDS.map((field) => ({ [field]: rx }));
    if (categoryIds.length > 0) or.push({ category: { $in: categoryIds } });
    return { $or: or };
  });

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

/** Category ObjectIds (as strings) whose name matches the query. Cheap — the
 *  Category collection is a couple of dozen docs. */
export async function resolveCategoryIds(search: string): Promise<string[]> {
  const q = (search ?? '').trim();
  if (!q) return [];
  const rx = { $regex: escapeRegex(q), $options: 'i' };
  const cats = await Category.find({ name: rx }).select('_id').lean();
  return (cats as Array<{ _id: unknown }>).map((c) => String(c._id));
}

/** Resolve category matches, then build the full filter. Call after connectDB(). */
export async function buildAdminProductQuery(
  search: string,
): Promise<Record<string, unknown> | null> {
  if (!(search ?? '').trim()) return null;
  const categoryIds = await resolveCategoryIds(search);
  return buildProductSearchFilter(search, categoryIds);
}
