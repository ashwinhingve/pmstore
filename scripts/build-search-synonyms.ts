import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import SaltSynonym from '../src/models/SaltSynonym';
import { SALT_ALIASES } from '../src/lib/pharma/composition';
import { buildSynonymGroups } from '../src/lib/search/synonyms';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Regenerate the `salt_synonyms` collection that feeds the Atlas Search synonym
 * mapping. Idempotent — upserts by `groupKey`, so it is safe to re-run whenever
 * SALT_ALIASES or the curated list changes.
 *
 * The equivalence logic itself is pure and unit-tested in
 * `src/lib/search/synonyms.test.ts`; this script is only the database shell.
 *
 * Usage:
 *   npx tsx scripts/build-search-synonyms.ts
 *
 * Run this BEFORE creating the Atlas Search index — the index references the
 * collection at build time (see docs/05-SETUP.md § Atlas Search).
 */
async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Check .env.local');
  }

  await mongoose.connect(mongoUri);

  const groups = buildSynonymGroups(SALT_ALIASES);

  // Upsert by groupKey. bulkWrite with explicit values is fine here — this
  // collection has no derived fields or pre-save hooks to bypass.
  const ops = groups.map((g) => ({
    updateOne: {
      filter: { groupKey: g.groupKey },
      update: { $set: { mappingType: g.mappingType, synonyms: g.synonyms, groupKey: g.groupKey } },
      upsert: true,
    },
  }));

  const result = await SaltSynonym.bulkWrite(ops);

  // Drop any stale groups no longer produced by the generator.
  const liveKeys = groups.map((g) => g.groupKey);
  const removed = await SaltSynonym.deleteMany({ groupKey: { $nin: liveKeys } });

  console.log(
    `Synonyms rebuilt: ${groups.length} groups ` +
      `(${result.upsertedCount} new, ${result.modifiedCount} updated, ${removed.deletedCount} stale removed).`
  );
  console.log('Now (re)build the Atlas Search index from scripts/atlas-search-index.json.');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('build-search-synonyms failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
