import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { claimOwnerWhatsappAlert } from './owner-notify-guard';

/**
 * Integration tests against a real MongoDB (mongodb-memory-server), per
 * docs/07-TESTING.md — the duplicate-prevention behaviour lives in the atomic
 * update, so it must be proven against a real database, not a mock. Orders are
 * inserted straight into the collection (bypassing schema validation) since the
 * claim only touches `_id` and `ownerWhatsappNotifiedAt`.
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

async function seedOrder(): Promise<mongoose.Types.ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('orders').insertOne({ _id, orderNumber: 'ORD-TEST' });
  return _id;
}

describe('claimOwnerWhatsappAlert', () => {
  it('returns true the first time and false on every later claim', async () => {
    const _id = await seedOrder();

    expect(await claimOwnerWhatsappAlert(_id)).toBe(true);
    expect(await claimOwnerWhatsappAlert(_id)).toBe(false);
    expect(await claimOwnerWhatsappAlert(_id)).toBe(false);
  });

  it('stamps ownerWhatsappNotifiedAt on the winning claim', async () => {
    const _id = await seedOrder();

    await claimOwnerWhatsappAlert(_id);

    const doc = await mongoose.connection.collection('orders').findOne({ _id });
    expect(doc?.ownerWhatsappNotifiedAt).toBeInstanceOf(Date);
  });

  it('lets exactly one of two concurrent claims win (the dual-callback race)', async () => {
    const _id = await seedOrder();

    const results = await Promise.all([
      claimOwnerWhatsappAlert(_id),
      claimOwnerWhatsappAlert(_id),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('returns false for an order that does not exist', async () => {
    const missing = new mongoose.Types.ObjectId();
    expect(await claimOwnerWhatsappAlert(missing)).toBe(false);
  });
});
