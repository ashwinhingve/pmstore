import * as z from 'zod';

/**
 * Search-parameter validation. Query strings arrive as strings, so numbers are
 * coerced and booleans are parsed explicitly (z.coerce.boolean() treats the
 * string "false" as true — never use it for a query flag).
 *
 * Keep this the single source of truth for what /api/search and
 * /api/search/suggest accept.
 */

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid category');

/** "true"/"false" query param → boolean | undefined (undefined = no filter). */
const queryBoolean = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

export const searchSortEnum = z.enum(['relevance', 'price_asc', 'price_desc', 'unit_price_asc']);

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1, 'Enter something to search for').max(100),
    page: z.coerce.number().int().min(1).catch(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).catch(20).default(20),
    category: objectId.optional(),
    prescriptionRequired: queryBoolean,
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: searchSortEnum.catch('relevance').default('relevance'),
  })
  .refine(
    (v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice,
    { message: 'Minimum price cannot exceed maximum price', path: ['minPrice'] }
  );

export const searchSuggestSchema = z.object({
  q: z.string().trim().min(1, 'Enter something to search for').max(100),
  limit: z.coerce.number().int().min(1).max(8).catch(8).default(8),
});

export type SortKey = z.infer<typeof searchSortEnum>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchSuggestQuery = z.infer<typeof searchSuggestSchema>;
