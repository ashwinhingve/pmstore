import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildStockDecrement } from './stock';
import { assertPrescriptionForCart, PrescriptionRequiredError } from './prescription-guard';
import Prescription from '@/models/Prescription';

/**
 * Integration tests against a real MongoDB (mongodb-memory-server), per
 * docs/07-TESTING.md — "do not mock Mongoose; the bugs live in the query and
 * hook behaviour." These prove the two week-4 safety mechanisms behave against
 * a real database: the stock/orderCount decrement and Rx enforcement.
 */

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('buildStockDecrement against MongoDB', () => {
  it('decrements stock and increments orderCount exactly once', async () => {
    const col = mongoose.connection.collection('products');
    const _id = new mongoose.Types.ObjectId();
    await col.insertOne({ _id, stock: 10, orderCount: 2 });

    const { filter, update } = buildStockDecrement({ productId: _id, quantity: 3 });
    const res = await col.updateOne(filter, update);
    expect(res.matchedCount).toBe(1);

    const after = await col.findOne({ _id });
    expect(after?.stock).toBe(7);
    expect(after?.orderCount).toBe(5);
  });

  it('matches nothing when stock is insufficient (the race guard)', async () => {
    const col = mongoose.connection.collection('products');
    const _id = new mongoose.Types.ObjectId();
    await col.insertOne({ _id, stock: 1, orderCount: 0 });

    const { filter, update } = buildStockDecrement({ productId: _id, quantity: 5 });
    const res = await col.updateOne(filter, update);
    expect(res.matchedCount).toBe(0);

    const after = await col.findOne({ _id });
    expect(after?.stock).toBe(1); // untouched
    expect(after?.orderCount).toBe(0);
  });

  it('decrements variant and root stock together', async () => {
    const col = mongoose.connection.collection('products');
    const _id = new mongoose.Types.ObjectId();
    await col.insertOne({ _id, stock: 5, orderCount: 0, variants: [{ id: 'v1', stock: 4 }] });

    const { filter, update } = buildStockDecrement({ productId: _id, variantId: 'v1', quantity: 2 });
    const res = await col.updateOne(filter, update);
    expect(res.matchedCount).toBe(1);

    const after = await col.findOne({ _id });
    expect(after?.stock).toBe(3);
    expect(after?.orderCount).toBe(2);
    expect(after?.variants[0].stock).toBe(2);
  });
});

describe('Rx enforcement against real Prescription documents', () => {
  const NOW = 1_700_000_000_000;
  const rxCart = [{ prescriptionRequired: true }];

  it('accepts a pending prescription owned by the buyer', async () => {
    const userId = new mongoose.Types.ObjectId();
    const created = await Prescription.create({
      userId,
      images: [{ url: 'https://example/x.jpg', publicId: 'x' }],
      status: 'pending',
    });
    const loaded = await Prescription.findById(created._id);

    expect(() =>
      assertPrescriptionForCart(rxCart, loaded, String(userId), NOW),
    ).not.toThrow();
  });

  it("rejects a prescription that belongs to another user (ObjectId compare)", async () => {
    const owner = new mongoose.Types.ObjectId();
    const created = await Prescription.create({
      userId: owner,
      images: [{ url: 'https://example/x.jpg', publicId: 'x' }],
      status: 'verified',
    });
    const loaded = await Prescription.findById(created._id);
    const otherUser = String(new mongoose.Types.ObjectId());

    expect(() => assertPrescriptionForCart(rxCart, loaded, otherUser, NOW)).toThrow(
      PrescriptionRequiredError,
    );
  });

  it('rejects an Rx cart when no prescription exists', async () => {
    const userId = String(new mongoose.Types.ObjectId());
    const found = await Prescription.findOne({ userId: new mongoose.Types.ObjectId() });
    expect(() => assertPrescriptionForCart(rxCart, found, userId, NOW)).toThrow(
      PrescriptionRequiredError,
    );
  });
});
