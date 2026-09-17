import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from './Product';
import Category from './Category';

/**
 * Integration test for the Product derive hook.
 *
 * Proves that compositionKey and unitPrice are derived on save() and — critically
 * — that the derivation runs on pre('validate'), BEFORE required-validation, so
 * the `required: true` on those two fields passes without them being hand-entered
 * (CLAUDE.md rule #2). A pre('save') hook would run after validation and fail.
 *
 * Uses mongodb-memory-server; the first run downloads a mongod binary.
 */

let mongod: MongoMemoryServer;
let categoryId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const cat = await Category.create({ name: 'Analgesics', slug: 'analgesics' });
  categoryId = cat._id;
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

const baseProduct = () => ({
  name: 'Dolo 650',
  slug: `dolo-650-${Math.floor(performance.now() * 1000)}`,
  sku: `PMS-ANA-D65-${Math.floor(performance.now() * 1000)}`,
  description: 'Paracetamol 650 mg tablet for fever and pain.',
  category: categoryId,
  price: 30.5,
  stock: 100,
  images: [{ url: 'https://example.com/x.jpg', publicId: 'x' }],
  salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
  form: 'tablet' as const,
  manufacturer: 'Micro Labs',
  packSize: 15,
  packUnit: 'tablet',
});

describe('Product derive hook', () => {
  it('derives unitPrice from price / packSize on save (30.5 / 15 → 2.03)', async () => {
    const p = await Product.create(baseProduct());
    expect(p.unitPrice).toBe(2.03);
  });

  it('derives a normalized compositionKey from salts + form', async () => {
    const p = await Product.create(baseProduct());
    expect(p.compositionKey).toBe('paracetamol-650mg|tablet');
  });

  it('recomputes unitPrice when price changes on an existing doc', async () => {
    const p = await Product.create(baseProduct());
    p.price = 45;
    await p.save();
    expect(p.unitPrice).toBe(3); // 45 / 15
  });

  it('rejects a product with no salts (required + hook guard)', async () => {
    const bad: any = baseProduct();
    bad.salts = [];
    await expect(Product.create(bad)).rejects.toThrow();
  });

  // Short description is optional (admin form + Zod, since 13d656d). The model
  // must agree, otherwise Product.create throws a ValidationError that the POST
  // handler surfaces as an opaque 500.
  it('creates a product with no short description', async () => {
    const noDesc: any = baseProduct();
    delete noDesc.description;
    const p = await Product.create(noDesc);
    expect(p._id).toBeDefined();
  });

  it('creates a product with an empty-string description (form sends "")', async () => {
    const p = await Product.create({ ...baseProduct(), description: '' });
    expect(p._id).toBeDefined();
  });

  // Non-medicinal products (brushes, devices) legitimately have no composition:
  // with noComposition set, empty salts + no form are allowed and no
  // compositionKey is derived, so they never join a same-salt comparison.
  it('saves a no-composition product (empty salts, no form) without a compositionKey', async () => {
    const brush: any = baseProduct();
    brush.name = 'Bamboo toothbrush';
    brush.noComposition = true;
    brush.salts = [];
    delete brush.form;
    const p = await Product.create(brush);
    expect(p._id).toBeDefined();
    expect(p.compositionKey).toBeUndefined();
    expect(p.unitPrice).toBeGreaterThan(0); // still derived from price / packSize
  });

  it('clears a stale compositionKey when a product is converted to no-composition', async () => {
    const p = await Product.create(baseProduct());
    expect(p.compositionKey).toBe('paracetamol-650mg|tablet');
    p.noComposition = true;
    p.salts = [] as any;
    p.form = undefined;
    await p.save();
    expect(p.compositionKey).toBeUndefined();
  });

  it('stores an expiry date', async () => {
    const p = await Product.create({ ...baseProduct(), expiryDate: '2027-05-01' });
    expect(p.expiryDate).toBeInstanceOf(Date);
    expect(p.expiryDate?.toISOString().slice(0, 10)).toBe('2027-05-01');
  });
});
