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
});
