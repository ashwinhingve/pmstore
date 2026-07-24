import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { executeSearch, executeSuggest } from '../src/lib/search/execute';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Search verification CLI (docs/05-SETUP.md § Atlas Search).
 *
 * Usage: npx tsx scripts/test-search.ts "paracetmol"
 *
 * Runs the real search + suggest path against MONGODB_URI. With the Atlas index
 * built it exercises fuzzy + synonyms; without it, executeSearch falls back to
 * the $text index and reports `degraded: true`. Use it to confirm, e.g., that
 * "paracetmol" (typo) returns paracetamol products once Atlas is live.
 */

async function main() {
  const q = process.argv.slice(2).join(' ').trim();
  if (!q) {
    console.error('Usage: npx tsx scripts/test-search.ts "<query>"');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set. Check .env.local');
  }

  await mongoose.connect(mongoUri);
  console.log(`\n🔎 Query: "${q}"\n`);

  const search = await executeSearch({ q, page: 1, limit: 10, sort: 'relevance', prescriptionRequired: undefined });
  console.log(
    `Results: ${search.meta.total} total` +
      (search.data.degraded ? '  ⚠️  degraded (no Atlas — $text fallback, no fuzzy/synonyms)' : '  (Atlas)')
  );
  for (const r of search.data.results as Array<Record<string, any>>) {
    const unit = typeof r.unitPrice === 'number' ? `₹${r.unitPrice.toFixed(2)}/${r.packUnit ?? 'unit'}` : '';
    console.log(`  • ${r.name}  —  ₹${r.price} (${unit})  [${r.manufacturer ?? '—'}]`);
  }

  const suggest = await executeSuggest({ q, limit: 8 });
  console.log(`\nSuggestions (${suggest.data.length}):`);
  for (const s of suggest.data as Array<Record<string, any>>) {
    console.log(`  • ${s.name}`);
  }

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

main().catch((err) => {
  console.error('❌ test-search failed:', err);
  process.exit(1);
});
