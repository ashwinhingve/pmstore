import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { nextSequence, nextRef } from './numbering';

/**
 * Reference numbering against a real MongoDB — the atomic $inc is the whole
 * point, so it's tested against the database, not a mock (docs/07-TESTING.md).
 */

let mongo: MongoMemoryServer;

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

describe('nextSequence', () => {
  it('starts at 1 and increments on each call', async () => {
    expect(await nextSequence('x')).toBe(1);
    expect(await nextSequence('x')).toBe(2);
    expect(await nextSequence('x')).toBe(3);
  });

  it('keeps separate counters independent', async () => {
    await nextSequence('a');
    await nextSequence('a');
    expect(await nextSequence('a')).toBe(3);
    expect(await nextSequence('b')).toBe(1);
  });

  it('never collides under concurrent increments', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => nextSequence('race'))
    );
    expect(new Set(results).size).toBe(20);
    expect(Math.max(...results)).toBe(20);
  });
});

describe('nextRef', () => {
  it('formats as PREFIX-YYYYMM-0001, zero-padded and incrementing', async () => {
    const date = new Date('2026-09-17T10:00:00Z');
    const first = await nextRef('PUR', date);
    const second = await nextRef('PUR', date);
    expect(first).toBe('PUR-202609-0001');
    expect(second).toBe('PUR-202609-0002');
  });
});
