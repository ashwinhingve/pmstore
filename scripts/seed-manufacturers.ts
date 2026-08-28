import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import mongoose from 'mongoose';
import ManufacturerCatalog from '../src/models/ManufacturerCatalog';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Seed the admin Manufacturer Catalog from the client's 88-company handwritten
 * list (transcribed and cross-checked against real Indian pharma manufacturers).
 *
 * Uses `.save()` per entry, not insertMany/upsert — `nameLower` is derived in the
 * model's `pre('validate')` document hook, which query-level upserts skip.
 *
 * Idempotent: an existing case-insensitive name is left untouched.
 *
 * Usage:
 *   npx tsx scripts/seed-manufacturers.ts data/manufacturers.json
 */
async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Usage: npx tsx scripts/seed-manufacturers.ts <file.json>');
  }
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set. Check .env.local');

  const names: string[] = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`Read ${names.length} manufacturer names from ${file}.`);

  await mongoose.connect(mongoUri);

  let created = 0;
  let existing = 0;
  const failures: { name: string; reason: string }[] = [];

  for (const name of names) {
    const nameLower = name.trim().toLowerCase();
    const found = await ManufacturerCatalog.findOne({ nameLower });
    if (found) {
      existing++;
      continue;
    }
    try {
      await new ManufacturerCatalog({ name }).save();
      created++;
    } catch (err) {
      failures.push({ name, reason: (err as Error).message });
    }
  }

  console.log(`Created ${created}, already present ${existing}, failed ${failures.length}.`);
  if (failures.length) {
    for (const f of failures) console.log(`  FAILED "${f.name}": ${f.reason}`);
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('seed-manufacturers failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
