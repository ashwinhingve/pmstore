import { describe, it, expect } from 'vitest';
import { buildProductSearchFilter, escapeRegex } from './product-search';

describe('escapeRegex', () => {
  it('escapes regex metacharacters so queries stay literal', () => {
    expect(escapeRegex('vitamin c (500)')).toBe('vitamin c \\(500\\)');
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
  });
});

describe('buildProductSearchFilter', () => {
  it('returns null for an empty query', () => {
    expect(buildProductSearchFilter('')).toBeNull();
    expect(buildProductSearchFilter('   ')).toBeNull();
  });

  it('matches a single word across every product text field', () => {
    const filter = buildProductSearchFilter('dolo') as { $or: Record<string, unknown>[] };
    expect(filter.$or).toBeDefined();
    const fields = filter.$or.map((c) => Object.keys(c)[0]);
    expect(fields).toEqual(
      expect.arrayContaining(['name', 'sku', 'description', 'manufacturer', 'salts.name', 'tags']),
    );
    // Case-insensitive regex on each field.
    const nameClause = filter.$or.find((c) => 'name' in c) as { name: { $regex: string; $options: string } };
    expect(nameClause.name.$options).toBe('i');
    expect(nameClause.name.$regex).toBe('dolo');
  });

  it('requires every word to match somewhere (AND across tokens)', () => {
    const filter = buildProductSearchFilter('dolo 650') as { $and: unknown[] };
    expect(Array.isArray(filter.$and)).toBe(true);
    expect(filter.$and).toHaveLength(2);
  });

  it('escapes metacharacters in each token', () => {
    const filter = buildProductSearchFilter('b12+') as { $or: Record<string, { $regex: string }>[] };
    const nameClause = filter.$or.find((c) => 'name' in c)!;
    expect(nameClause.name.$regex).toBe('b12\\+');
  });

  it('adds a category clause when category ids are supplied', () => {
    const filter = buildProductSearchFilter('cardiac', ['abc123']) as { $or: Record<string, unknown>[] };
    const categoryClause = filter.$or.find((c) => 'category' in c) as { category: { $in: string[] } };
    expect(categoryClause.category.$in).toEqual(['abc123']);
  });
});
