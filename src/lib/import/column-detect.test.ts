import { describe, it, expect } from 'vitest';
import { detectColumns, normalizeHeader, levenshtein } from './column-detect';

describe('normalizeHeader', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normalizeHeader('Max Retail Price')).toBe('maxretailprice');
    expect(normalizeHeader('M.R.P')).toBe('mrp');
    expect(normalizeHeader('Pack_Size')).toBe('packsize');
  });
});

describe('levenshtein', () => {
  it('measures single-edit distance', () => {
    expect(levenshtein('manufacturer', 'manufactrer')).toBe(1);
    expect(levenshtein('category', 'category')).toBe(0);
  });
});

describe('detectColumns', () => {
  it('maps common billing-software headers to the right fields', () => {
    const map = detectColumns([
      'SKU', 'Product Name', 'Company', 'Category', 'Dosage Form',
      'Selling Price', 'Qty', 'Max Retail Price', 'Composition',
    ]);
    expect(map.sku).toBe('SKU');
    expect(map.name).toBe('Product Name');
    expect(map.manufacturer).toBe('Company');
    expect(map.category).toBe('Category');
    expect(map.form).toBe('Dosage Form');
    expect(map.price).toBe('Selling Price');
    expect(map.pack_size).toBe('Qty');
    expect(map.mrp).toBe('Max Retail Price');
    expect(map.composition).toBe('Composition');
  });

  it('tolerates a one-character typo in a header', () => {
    const map = detectColumns(['Manufactrer', 'Categary', 'Name', 'Price', 'SKU', 'Form', 'Pack Size']);
    expect(map.manufacturer).toBe('Manufactrer');
    expect(map.category).toBe('Categary');
  });

  it('leaves unknown headers unassigned and never double-assigns one header', () => {
    const map = detectColumns(['Random Column', 'Name', 'SKU']);
    const assignedHeaders = Object.values(map).filter(Boolean);
    expect(assignedHeaders).not.toContain('Random Column');
    // No header is mapped to two different fields.
    expect(new Set(assignedHeaders).size).toBe(assignedHeaders.length);
  });

  it('keeps MRP and selling price on separate fields', () => {
    const map = detectColumns(['MRP', 'Selling Price']);
    expect(map.mrp).toBe('MRP');
    expect(map.price).toBe('Selling Price');
    expect(map.mrp).not.toBe(map.price);
  });
});
