/**
 * One-off consistency pass run after importing the real catalogue.
 *
 *   npx tsx scripts/deactivate-demo-seed.ts
 *
 * The demo seed products (SKUs PMS-0001..PMS-0009, from data/sample-catalogue.csv)
 * overlap the real catalogue — e.g. two "Dolo 650" listings. This deactivates them
 * so the imported catalogue is the single source of truth on the storefront.
 *
 * Non-destructive: it sets isActive=false (admin can re-enable), never deletes a
 * product. It also removes any category that no product references. Real catalogue
 * SKUs (PMS-<A-G><3-digit>) are never touched. Idempotent — safe to re-run.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import Product from '../src/models/Product';
import Category from '../src/models/Category';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  // Deactivate demo seed products (4-digit SKUs). Per-doc save(), not updateMany,
  // so the pre-validate hook still owns compositionKey/unitPrice (CLAUDE.md rule #2).
  const demo = await Product.find({ sku: { $regex: /^PMS-\d{4}$/ } });
  let deactivated = 0;
  for (const p of demo) {
    if (p.isActive) {
      p.isActive = false;
      await p.save();
      deactivated++;
    }
  }
  console.log(`Deactivated ${deactivated} demo product(s): ${demo.map((p) => p.sku).join(', ') || '(none)'}`);

  // Remove categories no product references (safe — nothing points at them).
  const cats = await Category.find({}).lean();
  let removed = 0;
  for (const c of cats) {
    if ((await Product.countDocuments({ category: c._id })) === 0) {
      await Category.deleteOne({ _id: c._id });
      console.log(`Removed empty category: ${(c as { name?: string }).name}`);
      removed++;
    }
  }
  console.log(`Removed ${removed} empty categories.`);

  const active = await Product.countDocuments({ sku: { $regex: /^PMS-[A-G]\d{3}$/ }, isActive: true });
  console.log(`Active catalogue products: ${active}`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('deactivate-demo-seed failed:', (e as Error).message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
