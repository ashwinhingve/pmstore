import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '@/models/Product';
import StockBatch from '@/models/StockBatch';
import { getInventoryOverview } from './valuation';

/**
 * Inventory valuation + attention counts against a real MongoDB. Proves the
 * per-product reorderLevel low-stock rule and the expiring/expired windows.
 */

let mongo: MongoMemoryServer;
let seq = 0;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

async function makeProduct(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return Product.create({
    name: `Med ${seq}`, slug: `med-${seq}`, sku: `PMS-V-${seq}`,
    category: new mongoose.Types.ObjectId(), price: 30, stock: 0,
    salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }], form: 'tablet',
    manufacturer: 'Labs', packSize: 10, packUnit: 'tablet', ...overrides,
  });
}

const days = (n: number) => new Date(Date.now() + n * 86_400_000);

describe('getInventoryOverview', () => {
  it('values live batches and counts low / out / expiring / expired correctly', async () => {
    // P1: low by its own reorderLevel (5 <= 20)
    const p1 = await makeProduct({ stock: 5, reorderLevel: 20 });
    await StockBatch.create({ productId: p1._id, batchNumber: 'A', expiryDate: new Date('2099-01-01'), costPrice: 10, mrp: 20, quantityReceived: 5, quantityRemaining: 5 });
    // P2: not low (15 > default 10); its batch is expiring soon (30 days)
    const p2 = await makeProduct({ stock: 15 });
    await StockBatch.create({ productId: p2._id, batchNumber: 'B', expiryDate: days(30), costPrice: 8, mrp: 12, quantityReceived: 15, quantityRemaining: 15 });
    // P3: out of stock, no batch
    await makeProduct({ stock: 0 });
    // P4: low (3 <= 5); its batch is already expired
    const p4 = await makeProduct({ stock: 3, reorderLevel: 5 });
    await StockBatch.create({ productId: p4._id, batchNumber: 'C', expiryDate: days(-5), costPrice: 5, mrp: 10, quantityReceived: 3, quantityRemaining: 3 });

    const o = await getInventoryOverview();

    expect(o.totalProducts).toBe(4);
    expect(o.outOfStock).toBe(1);
    expect(o.lowStock).toBe(2); // P1 + P4
    expect(o.expiringSoon).toBe(1); // P2
    expect(o.expired).toBe(1); // P4
    expect(o.unitsInStock).toBe(23);
    expect(o.liveBatches).toBe(3);
    expect(o.stockValueAtCost).toBe(5 * 10 + 15 * 8 + 3 * 5); // 185
    expect(o.stockValueAtMrp).toBe(5 * 20 + 15 * 12 + 3 * 10); // 310
  });
});
