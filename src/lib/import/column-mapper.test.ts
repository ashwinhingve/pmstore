import { describe, it, expect } from 'vitest';
import { applyColumnMapping } from './column-mapper';

describe('applyColumnMapping', () => {
  it('returns the row unchanged when no mapping is given', () => {
    const row = { sku: 'ABC', name: 'Dolo' };
    expect(applyColumnMapping(row)).toEqual(row);
    expect(applyColumnMapping(row, undefined)).toEqual(row);
    expect(applyColumnMapping(row, null)).toEqual(row);
  });

  it('returns the row unchanged for an empty mapping object', () => {
    const row = { sku: 'ABC', name: 'Dolo' };
    expect(applyColumnMapping(row, {})).toEqual(row);
  });

  it('renames mapped headers to their canonical target', () => {
    const row = { 'Product Name': 'Dolo 650', Company: 'Micro Labs' };
    const mapping = { 'Product Name': 'name', Company: 'manufacturer' };
    expect(applyColumnMapping(row, mapping)).toEqual({
      name: 'Dolo 650',
      manufacturer: 'Micro Labs',
    });
  });

  it('passes through headers that have no explicit mapping entry', () => {
    // "price" already matches the canonical name — the admin only mapped the
    // two columns that were actually different, so "price" must survive.
    const row = { 'Product Name': 'Dolo 650', price: '30.5' };
    const mapping = { 'Product Name': 'name' };
    expect(applyColumnMapping(row, mapping)).toEqual({
      name: 'Dolo 650',
      price: '30.5',
    });
  });

  it('does not drop a value when two source headers map to the same target', () => {
    const row = { 'Product Name': 'Dolo 650', title: 'ignored' };
    const mapping = { 'Product Name': 'name', title: 'name' };
    const result = applyColumnMapping(row, mapping);
    // Last-write-wins for a colliding target; both keys land on "name".
    expect(Object.keys(result)).toEqual(['name']);
  });
});
