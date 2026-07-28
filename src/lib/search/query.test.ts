import { describe, it, expect } from 'vitest';
import {
  buildSearchPipeline,
  buildSuggestPipeline,
  buildFacetPipeline,
  fuzzyForTerm,
  sortSpec,
  SEARCH_INDEX,
} from './query';

// Small helpers to dig into the generated pipeline without repeating casts.
function searchStage(pipeline: Record<string, unknown>[]) {
  return pipeline.find((s) => '$search' in s)!.$search as any;
}

describe('fuzzyForTerm', () => {
  it('disables fuzzy for very short terms (<=2 chars)', () => {
    expect(fuzzyForTerm('ab')).toBeNull();
  });
  it('allows one edit for short terms (3-4 chars)', () => {
    expect(fuzzyForTerm('abcd')).toEqual({ maxEdits: 1 });
  });
  it('allows two edits for longer terms (>=5 chars)', () => {
    expect(fuzzyForTerm('abcde')).toEqual({ maxEdits: 2 });
    expect(fuzzyForTerm('paracetamol')).toEqual({ maxEdits: 2 });
  });
});

describe('buildSearchPipeline', () => {
  it('targets the products_search index with a compound query', () => {
    const search = searchStage(buildSearchPipeline({ q: 'dolo' }));
    expect(search.index).toBe(SEARCH_INDEX);
    expect(search.compound).toBeDefined();
    expect(search.compound.minimumShouldMatch).toBe(1);
  });

  it('searches name, salts.name and manufacturer', () => {
    const { compound } = searchStage(buildSearchPipeline({ q: 'paracetamol' }));
    const paths = compound.should.map((c: any) => c.text.path);
    expect(paths).toContain('name');
    expect(paths).toContain('salts.name');
    expect(paths).toContain('manufacturer');
  });

  it('boosts brand name above salt name', () => {
    const { compound } = searchStage(buildSearchPipeline({ q: 'dolo' }));
    const nameBoost = compound.should.find((c: any) => c.text.path === 'name').text.score.boost.value;
    const saltBoost = compound.should.find((c: any) => c.text.path === 'salts.name').text.score.boost.value;
    expect(nameBoost).toBeGreaterThan(saltBoost);
  });

  it('always filters to active, non-discontinued products', () => {
    const { compound } = searchStage(buildSearchPipeline({ q: 'dolo' }));
    const equalsFilters = compound.filter.map((f: any) => f.equals).filter(Boolean);
    expect(equalsFilters).toEqual(
      expect.arrayContaining([
        { path: 'isActive', value: true },
        { path: 'isDiscontinued', value: false },
      ])
    );
  });

  it('expands salt aliases via a separate synonyms clause (Atlas bars fuzzy+synonyms together)', () => {
    const { compound } = searchStage(buildSearchPipeline({ q: 'acetaminophen' }));
    const synonymClause = compound.should.find(
      (c: any) => c.text.path === 'salts.name' && c.text.synonyms
    );
    expect(synonymClause.text.synonyms).toBe('salt_synonyms');
    expect(synonymClause.text.fuzzy).toBeUndefined();
  });

  it('applies fuzzy matching sized to the longest query word', () => {
    const { compound } = searchStage(buildSearchPipeline({ q: 'paracetmol 650' }));
    const nameClause = compound.should.find((c: any) => c.text.path === 'name');
    expect(nameClause.text.fuzzy).toEqual({ maxEdits: 2 });
  });

  it('paginates with skip and limit', () => {
    const pipeline = buildSearchPipeline({ q: 'dolo', page: 3, limit: 20 });
    expect(pipeline).toContainEqual({ $skip: 40 });
    expect(pipeline).toContainEqual({ $limit: 20 });
  });

  it('passes an optional category filter through untouched (route supplies an ObjectId)', () => {
    const sentinel = { __objectId: 'abc' };
    const { compound } = searchStage(buildSearchPipeline({ q: 'dolo', filters: { category: sentinel } }));
    expect(compound.filter).toContainEqual({ equals: { path: 'category', value: sentinel } });
  });

  it('supports a prescriptionRequired filter', () => {
    const { compound } = searchStage(buildSearchPipeline({ q: 'dolo', filters: { prescriptionRequired: true } }));
    expect(compound.filter).toContainEqual({ equals: { path: 'prescriptionRequired', value: true } });
  });

  it('supports a price band as a range filter', () => {
    const { compound } = searchStage(buildSearchPipeline({ q: 'dolo', filters: { minPrice: 10, maxPrice: 100 } }));
    expect(compound.filter).toContainEqual({ range: { path: 'price', gte: 10, lte: 100 } });
  });

  it('projects the card fields and the relevance score', () => {
    const pipeline = buildSearchPipeline({ q: 'dolo' });
    const project = pipeline.find((s) => '$project' in s)!.$project as any;
    expect(project.name).toBe(1);
    expect(project.unitPrice).toBe(1);
    expect(project.score).toEqual({ $meta: 'searchScore' });
  });

  it('adds no $sort for relevance (keeps Atlas score order)', () => {
    expect(buildSearchPipeline({ q: 'dolo' }).some((s) => '$sort' in s)).toBe(false);
    expect(buildSearchPipeline({ q: 'dolo', sort: 'relevance' }).some((s) => '$sort' in s)).toBe(false);
  });

  it('inserts a $sort before $skip for an explicit sort', () => {
    const pipeline = buildSearchPipeline({ q: 'dolo', sort: 'price_asc', page: 2, limit: 20 });
    const sortIdx = pipeline.findIndex((s) => '$sort' in s);
    const skipIdx = pipeline.findIndex((s) => '$skip' in s);
    expect(sortIdx).toBeGreaterThanOrEqual(0);
    expect(sortIdx).toBeLessThan(skipIdx);
    expect((pipeline[sortIdx] as any).$sort).toEqual({ price: 1 });
  });
});

describe('sortSpec', () => {
  it('maps price and unit-price sorts to field specs', () => {
    expect(sortSpec('price_asc')).toEqual({ price: 1 });
    expect(sortSpec('price_desc')).toEqual({ price: -1 });
    expect(sortSpec('unit_price_asc')).toEqual({ unitPrice: 1 });
  });

  it('returns null for relevance / undefined (engine keeps score order)', () => {
    expect(sortSpec('relevance')).toBeNull();
    expect(sortSpec(undefined)).toBeNull();
  });
});

describe('buildSuggestPipeline', () => {
  it('prefix-matches the brand name with the autocomplete operator', () => {
    const search = searchStage(buildSuggestPipeline({ q: 'para' }));
    expect(search.index).toBe(SEARCH_INDEX);
    expect(search.compound.minimumShouldMatch).toBe(1);
    const auto = search.compound.should.find((c: any) => c.autocomplete);
    expect(auto.autocomplete.path).toBe('name');
  });

  it('also token-matches the salt so a composition query suggests brands', () => {
    const search = searchStage(buildSuggestPipeline({ q: 'paracetamol' }));
    const saltClauses = search.compound.should.filter(
      (c: any) => c.text && c.text.path === 'salts.name'
    );
    expect(saltClauses.length).toBeGreaterThanOrEqual(1);
    // One salt clause carries synonyms for alias expansion.
    expect(saltClauses.some((c: any) => c.text.synonyms === 'salt_synonyms')).toBe(true);
  });

  it('boosts brand-name suggestions above salt suggestions', () => {
    const search = searchStage(buildSuggestPipeline({ q: 'dolo' }));
    const nameBoost = search.compound.should.find((c: any) => c.autocomplete).autocomplete.score.boost.value;
    const saltBoost = search.compound.should.find(
      (c: any) => c.text && c.text.path === 'salts.name'
    ).text.score.boost.value;
    expect(nameBoost).toBeGreaterThan(saltBoost);
  });

  it('never returns more than 8 suggestions', () => {
    const pipeline = buildSuggestPipeline({ q: 'para', limit: 50 });
    expect(pipeline).toContainEqual({ $limit: 8 });
  });

  it('filters out inactive/discontinued products', () => {
    const pipeline = buildSuggestPipeline({ q: 'para' });
    const match = pipeline.find((s) => '$match' in s)!.$match as any;
    expect(match.isActive).toBe(true);
    expect(match.isDiscontinued).toBe(false);
  });
});

describe('buildFacetPipeline', () => {
  it('runs the same search, then counts facets natively with $facet', () => {
    const pipeline = buildFacetPipeline({ q: 'dolo' });
    expect(searchStage(pipeline).index).toBe(SEARCH_INDEX);
    const facet = pipeline.find((s) => '$facet' in s)!.$facet as any;
    expect(facet.category).toBeDefined();
    expect(facet.prescriptionRequired).toBeDefined();
    expect(facet.price).toBeDefined();
  });

  it('buckets price by the band boundaries', () => {
    const facet = buildFacetPipeline({ q: 'dolo' }).find((s) => '$facet' in s)!.$facet as any;
    const bucket = facet.price[0].$bucket;
    expect(bucket.groupBy).toBe('$price');
    expect(Array.isArray(bucket.boundaries)).toBe(true);
  });

  it('groups category counts by the category field', () => {
    const facet = buildFacetPipeline({ q: 'dolo' }).find((s) => '$facet' in s)!.$facet as any;
    expect(facet.category[0].$group._id).toBe('$category');
  });
});
