import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import Product from '../src/models/Product';
import { buildCompositionKey, computeUnitPrice } from '../src/lib/pharma/composition';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Recompute the derived fields (compositionKey, unitPrice) for every product
 * that has a composition. Run this after any bulk write that bypassed the
 * Mongoose document hook (insertMany / updateMany / a raw import).
 *
 * Usage: npx tsx scripts/backfill-composition.ts
 *
 * Writes go through bulkWrite with EXPLICITLY computed values (CLAUDE.md rule
 * #2) — never updateMany, which would leave the values stale, and this avoids
 * re-running full-document validation on each product.
 */

async function backfill() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set. Check .env.local');
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const products = await Product.find(
    { salts: { $exists: true, $ne: [] } },
    { salts: 1, form: 1, price: 1, packSize: 1 }
  ).lean();

  const ops: any[] = [];
  let skipped = 0;

  for (const p of products) {
    const salts = (p as any).salts;
    const form = (p as any).form;
    const price = (p as any).price;
    const packSize = (p as any).packSize;

    if (!salts?.length || !form) {
      skipped++;
      continue;
    }

    try {
      const compositionKey = buildCompositionKey(salts, form);
      const unitPrice = computeUnitPrice(price, packSize);
      ops.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { compositionKey, unitPrice } },
        },
      });
    } catch (err: any) {
      skipped++;
      console.warn(`⚠️  Skipped ${p._id}: ${err.message}`);
    }
  }

  if (ops.length) {
    const res = await Product.bulkWrite(ops);
    console.log(`\n📊 Backfill summary:`);
    console.log(`   ✅ Recomputed: ${res.modifiedCount}/${ops.length}`);
  } else {
    console.log('\nNothing to backfill.');
  }
  if (skipped) console.log(`   ⚠️  Skipped:    ${skipped}`);

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

backfill().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
