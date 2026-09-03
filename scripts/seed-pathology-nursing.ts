import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import Category from '../src/models/Category';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Seed the "Pathology & Nursing Care" category.
 *
 * This is a service, not a purchasable product — its homepage tile routes to
 * `/pathology-nursing-care` (src/components/landing/Categories.tsx), not a
 * /products filter, so unlike scripts/seed-surgical.ts there's no product
 * catalogue to seed here — just the Category doc so the tile shows on the
 * live homepage (Categories.tsx reads from the DB, falling back to
 * src/lib/categories.ts only when the DB has none).
 *
 * Idempotent: matched by name.
 *
 * Usage:
 *   npx tsx scripts/seed-pathology-nursing.ts
 */

const CATEGORY = { name: 'Pathology & Nursing Care', slug: 'pathology-nursing-care', icon: '🔬' };

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set. Check .env.local');

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const existing = await Category.findOne({ name: CATEGORY.name });
  if (existing) {
    console.log(`Skipped (exists): ${CATEGORY.name}`);
  } else {
    await new Category({
      name: CATEGORY.name,
      slug: CATEGORY.slug,
      icon: CATEGORY.icon,
      image: '',
      isActive: true,
    }).save();
    console.log(`Created: ${CATEGORY.name}`);
  }

  console.log('\n✅ Pathology & Nursing Care category seeded. Add a photo in Admin → Categories if you have one.');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
