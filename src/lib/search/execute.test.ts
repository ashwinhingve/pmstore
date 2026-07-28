import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { parseCsv } from '@/lib/import/csv';
import { parseProductRow } from '@/lib/import/product-row';
import { computeUnitPrice } from '@/lib/pharma/composition';
import { executeSearch, executeSuggest } from './execute';

/**
 * End-to-end proof for the catalogue → search chain, WITHOUT Atlas.
 *
 * Imports data/sample-catalogue.csv through the real parseCsv + parseProductRow,
 * saves each product (so the derive hook runs), then searches. A plain mongod
 * (memory-server) has no `$search` stage, so executeSearch/executeSuggest take
 * their `$text`/regex fallback path — which is exactly what runs locally until
 * an Atlas index is built. Fuzzy + synonym behaviour needs Atlas and is verified
 * separately via scripts/test-search.ts.
 */

let mongod: MongoMemoryServer;

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const catCache = new Map<string, mongoose.Types.ObjectId>();

async function resolveCategory(name: string): Promise<mongoose.Types.ObjectId> {
  const key = name.toLowerCase();
  const hit = catCache.get(key);
  if (hit) return hit;
  const cat = (await Category.findOne({ name })) ?? (await Category.create({ name, slug: slugify(name) }));
  catCache.set(key, cat._id);
  return cat._id;
}

async function seedFromCsv() {
  const csvPath = join(dirname(fileURLToPath(import.meta.url)), '../../../data/sample-catalogue.csv');
  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  expect(rows.length).toBeGreaterThan(0);

  for (const raw of rows) {
    const res = parseProductRow(raw);
    if (!res.ok) throw new Error(`sample row rejected (${res.sku}): ${res.reason}`);
    const row = res.value;
    const category = await resolveCategory(row.categoryName);
    const doc = new Product();
    doc.set({
      sku: row.sku,
      name: row.name,
      manufacturer: row.manufacturer,
      category,
      salts: row.salts,
      form: row.form,
      packSize: row.packSize,
      packUnit: row.packUnit,
      price: row.price,
      mrp: row.mrp,
      gstRate: row.gstRate,
      stock: row.stock,
      prescriptionRequired: row.prescriptionRequired,
      scheduleClass: row.scheduleClass,
      description: row.description,
      sideEffects: row.sideEffects,
      contraindications: row.contraindications,
      isActive: row.isActive,
      slug: `${slugify(row.name)}-${slugify(row.sku)}`,
      images: row.imageUrls.map((url, i) => ({ url, publicId: `imported:${row.sku}:${i}` })),
    });
    await doc.save();
  }
  // Build the $text index the fallback relies on.
  await Product.createIndexes();
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedFromCsv();
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

describe('catalogue import (proves the derive hook end-to-end)', () => {
  it('imports every sample row and derives compositionKey + unitPrice', async () => {
    const products = await Product.find().lean();
    expect(products.length).toBe(9);
    for (const p of products) {
      expect(p.compositionKey).toBeTruthy();
      expect(p.unitPrice).toBe(computeUnitPrice(p.price, p.packSize));
    }
  });

  it('groups the four Paracetamol 650 brands under one compositionKey', async () => {
    const paracetamol = await Product.find({ compositionKey: 'paracetamol-650mg|tablet' }).lean();
    expect(paracetamol.map((p) => p.name).sort()).toEqual(
      ['Calpol 650', 'Crocin 650', 'Dolo 650', 'Paracip 650']
    );
  });

  it('forces prescriptionRequired for the Schedule H antibiotic', async () => {
    const aug = await Product.findOne({ sku: 'PMS-0005' }).lean<{ prescriptionRequired?: boolean } | null>();
    expect(aug?.prescriptionRequired).toBe(true);
  });
});

describe('executeSearch (no Atlas → $text fallback)', () => {
  it('finds Dolo 650 for "dolo" and reports degraded', async () => {
    const res = await executeSearch({ q: 'dolo', page: 1, limit: 20, sort: 'relevance', prescriptionRequired: undefined });
    expect(res.data.degraded).toBe(true);
    expect((res.data.results as Array<{ name: string }>).some((r) => r.name === 'Dolo 650')).toBe(true);
  });

  it('honours sort=price_asc in the fallback', async () => {
    const res = await executeSearch({ q: 'paracetamol', page: 1, limit: 20, sort: 'price_asc', prescriptionRequired: undefined });
    const prices = (res.data.results as Array<{ price: number }>).map((r) => r.price);
    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

describe('executeSuggest (no Atlas → regex-prefix fallback)', () => {
  it('suggests Dolo 650 for the prefix "dol"', async () => {
    const res = await executeSuggest({ q: 'dol', limit: 8 });
    expect((res.data as Array<{ name: string }>).some((r) => r.name === 'Dolo 650')).toBe(true);
  });

  it('suggests brands by composition — "para" surfaces Crocin (salt match, not name)', async () => {
    const res = await executeSuggest({ q: 'para', limit: 8 });
    const names = (res.data as Array<{ name: string }>).map((r) => r.name);
    // Crocin 650 does not start with "para" — it can only be found via its salt.
    expect(names).toContain('Crocin 650');
  });
});
