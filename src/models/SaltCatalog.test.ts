import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SaltCatalog from './SaltCatalog';

/**
 * Integration test for the SaltCatalog model. Proves nameLower is derived from
 * name on pre('validate') and carries a unique index, so a case-variant of an
 * existing salt is rejected rather than creating a duplicate suggestion.
 */

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Ensure the unique index on nameLower is built before the duplicate test runs.
  await SaltCatalog.init();
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

describe('SaltCatalog', () => {
  it('derives nameLower from name', async () => {
    const doc = await SaltCatalog.create({ name: '  Norfloxacin + Tinidazole  ' });
    expect(doc.name).toBe('Norfloxacin + Tinidazole'); // trimmed
    expect(doc.nameLower).toBe('norfloxacin + tinidazole');
  });

  it('rejects a case-variant duplicate', async () => {
    await SaltCatalog.create({ name: 'Rifaximin' });
    await expect(SaltCatalog.create({ name: 'RIFAXIMIN' })).rejects.toThrow();
  });
});
