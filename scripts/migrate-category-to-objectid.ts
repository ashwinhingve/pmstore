import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import Product from '../src/models/Product';
import Category from '../src/models/Category';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * One-time migration: Product.category String -> ObjectId ref to Category.
 *
 * Usage: npx tsx scripts/migrate-category-to-objectid.ts
 *
 * For every product whose `category` is still a name string, find-or-create the
 * matching Category and repoint `category` to its _id. Idempotent — products
 * already holding an ObjectId are skipped, so it is safe to re-run.
 *
 * This updates ONLY the `category` field via updateOne, which is deliberate:
 * category is not a derived value, so skipping the pre('validate') hook here is
 * correct, and it avoids full-document validation failing on legacy products
 * that lack the now-required pharma fields. (The hook only guards salts/form/
 * price/packSize — see CLAUDE.md rule #2.)
 */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

async function migrate() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set. Check .env.local');
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  // Pull raw docs so we see the stored category type, not a cast value.
  const products = await Product.find({}, { category: 1 }).lean();

  const cache = new Map<string, mongoose.Types.ObjectId>();
  let migrated = 0;
  let alreadyOk = 0;
  let blank = 0;

  for (const p of products) {
    const raw = (p as any).category;

    // Already an ObjectId (or a 24-hex string that casts cleanly) — skip.
    if (raw instanceof mongoose.Types.ObjectId) {
      alreadyOk++;
      continue;
    }
    if (typeof raw !== 'string' || !raw.trim()) {
      blank++;
      console.warn(`⚠️  Product ${p._id} has no usable category — leaving as is`);
      continue;
    }
    if (/^[a-f\d]{24}$/i.test(raw)) {
      alreadyOk++;
      continue;
    }

    const name = raw.trim();
    let categoryId = cache.get(name.toLowerCase());

    if (!categoryId) {
      const existing = await Category.findOne({ name });
      if (existing) {
        categoryId = existing._id;
      } else {
        const created = await Category.create({ name, slug: slugify(name) });
        categoryId = created._id;
        console.log(`➕ Created category "${name}"`);
      }
      cache.set(name.toLowerCase(), categoryId!);
    }

    await Product.updateOne({ _id: p._id }, { $set: { category: categoryId } });
    migrated++;
  }

  console.log('\n📊 Migration summary:');
  console.log(`   ✅ Migrated to ObjectId: ${migrated}`);
  console.log(`   ⏭️  Already ObjectId:     ${alreadyOk}`);
  console.log(`   ⚠️  Left unchanged:       ${blank}`);

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
