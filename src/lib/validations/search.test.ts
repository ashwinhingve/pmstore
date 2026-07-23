import { describe, it, expect } from 'vitest';
import { searchQuerySchema, searchSuggestSchema } from './search';

describe('searchQuerySchema', () => {
  it('applies defaults for page, limit and sort', () => {
    const v = searchQuerySchema.parse({ q: 'dolo' });
    expect(v.page).toBe(1);
    expect(v.limit).toBe(20);
    expect(v.sort).toBe('relevance');
  });

  it('coerces numeric query strings', () => {
    const v = searchQuerySchema.parse({ q: 'dolo', page: '3', limit: '40' });
    expect(v.page).toBe(3);
    expect(v.limit).toBe(40);
  });

  it('clamps an over-large limit back to the default rather than rejecting', () => {
    const v = searchQuerySchema.parse({ q: 'dolo', limit: '9999' });
    expect(v.limit).toBe(20);
  });

  it('rejects an empty query', () => {
    expect(searchQuerySchema.safeParse({ q: '' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
  });

  it('parses prescriptionRequired=false as the boolean false, not truthy string', () => {
    expect(searchQuerySchema.parse({ q: 'dolo', prescriptionRequired: 'false' }).prescriptionRequired).toBe(false);
    expect(searchQuerySchema.parse({ q: 'dolo', prescriptionRequired: 'true' }).prescriptionRequired).toBe(true);
    expect(searchQuerySchema.parse({ q: 'dolo' }).prescriptionRequired).toBeUndefined();
  });

  it('rejects a malformed category id', () => {
    expect(searchQuerySchema.safeParse({ q: 'dolo', category: 'not-an-id' }).success).toBe(false);
  });

  it('rejects an inverted price band', () => {
    expect(searchQuerySchema.safeParse({ q: 'dolo', minPrice: '100', maxPrice: '10' }).success).toBe(false);
  });
});

describe('searchSuggestSchema', () => {
  it('caps the suggest limit at 8', () => {
    expect(searchSuggestSchema.parse({ q: 'para', limit: '50' }).limit).toBe(8);
  });
});
