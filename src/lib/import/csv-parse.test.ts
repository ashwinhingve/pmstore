import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv } from './csv-parse';

describe('parseCsv', () => {
  it('parses a simple CSV with headers and data', () => {
    const csv = 'name,price,stock\nDolo,30.50,100\nAspirin,15.00,50';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'Dolo', price: '30.50', stock: '100' });
    expect(rows[1]).toEqual({ name: 'Aspirin', price: '15.00', stock: '50' });
  });

  it('parses quoted fields with embedded commas', () => {
    const csv = 'name,description\nProduct,"A, B, C"\nOther,"X"';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].description).toBe('A, B, C');
    expect(rows[1].description).toBe('X');
  });

  it('handles escaped quotes within quoted fields', () => {
    const csv = 'name,note\nDrug,"She said ""Yes"""\nOther,"Quote"';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].note).toBe('She said "Yes"');
    expect(rows[1].note).toBe('Quote');
  });

  it('handles CRLF line endings', () => {
    const csv = 'sku,name\r\nPMS-001,Dolo\r\nPMS-002,Aspirin';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].sku).toBe('PMS-001');
    expect(rows[1].sku).toBe('PMS-002');
  });

  it('ignores empty trailing lines', () => {
    const csv = 'name,price\nDolo,30\nAspirin,15\n\n';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it('trims BOM if present', () => {
    const csv = '﻿name,price\nDolo,30';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Dolo');
  });

  it('round-trips toCsv and parseCsv (comma-bearing field survives)', () => {
    // toCsv writes exactly the columns it's given (the export route always
    // passes an explicit column list), so every row must share those keys.
    const original = [
      { name: 'Dolo', description: 'Pain relief', stock: '100' },
      { name: 'Aspirin', description: 'A, B, C', stock: '50' },
    ];
    const csv = toCsv(original, ['name', 'description', 'stock']);
    const parsed = parseCsv(csv);
    expect(parsed[0].name).toBe('Dolo');
    expect(parsed[0].description).toBe('Pain relief');
    expect(parsed[1].description).toBe('A, B, C');
    expect(parsed[1].stock).toBe('50');
  });

  it('toCsv quotes fields with commas', () => {
    const rows = [{ name: 'Product, Inc', price: '50' }];
    const csv = toCsv(rows);
    expect(csv).toContain('"Product, Inc"');
  });

  it('toCsv quotes fields with double quotes and escapes them', () => {
    const rows = [{ name: 'Dr. "Smith"', price: '100' }];
    const csv = toCsv(rows);
    expect(csv).toContain('Dr. ""Smith""');
  });

  it('handles empty fields', () => {
    const csv = 'name,price,stock\nDolo,,100\n,30,';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].price).toBe('');
    expect(rows[1].name).toBe('');
  });

  it('preserves column order in toCsv', () => {
    const rows = [{ z: '1', a: '2', m: '3' }];
    const csv = toCsv(rows, ['a', 'm', 'z']);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('a,m,z');
    expect(lines[1]).toBe('2,3,1');
  });
});
