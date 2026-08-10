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
 * Seed Surgical & Medical Supplies — starter catalogue for the new home category.
 *
 * The storefront now shows a "Surgical & Medical Supplies" tile
 * (src/lib/categories.ts). That tile links to `/products?category=<name>`, so the
 * category needs a few products or it dead-ends on the empty state. This seeds the
 * Category doc and a handful of common consumables/devices.
 *
 * These are supplies, not formulated drugs, so they have no real "salt". Each
 * carries a nominal descriptor in `salts` (same approach the Ayurveda seed uses
 * for herbal blends) purely so the pre-validate hook can derive compositionKey and
 * unitPrice — none of them share a key, so the Strip never groups them. Prices are
 * best-effort PLACEHOLDERS; the shop edits them in Admin later.
 *
 * Idempotent: category matched by name, products upserted by SKU (PMS-SUR-*).
 * Each product is saved individually so the pre-validate hook runs (CLAUDE.md
 * rule #2 — never insertMany).
 *
 * CRITICAL: writes to whatever MONGODB_URI points to in .env.local.
 *
 * Usage:
 *   npx tsx scripts/seed-surgical.ts
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// The new category. Name MUST match src/lib/categories.ts exactly.
const CATEGORIES = [
  { name: 'Surgical & Medical Supplies', slug: 'surgical', icon: '🩹' },
];

type SeedProduct = {
  name: string;
  manufacturer: string;
  sku: string;
  category: string;
  salts: { name: string; strength: number; unit: 'mg' | 'mcg' | 'g' | 'ml' | 'iu' | '%' }[];
  form:
    | 'tablet' | 'capsule' | 'syrup' | 'suspension' | 'injection' | 'cream'
    | 'ointment' | 'gel' | 'drops' | 'inhaler' | 'powder' | 'sachet' | 'spray'
    | 'patch' | 'other';
  packSize: number;
  packUnit: string;
  price: number;
  mrp: number;
  stock: number;
  gstRate: number;
};

// Common surgical / medical consumables and small devices. packSize is the count
// in the pack, so unitPrice reads as "price per piece/ml".
const PRODUCTS: SeedProduct[] = [
  {
    name: 'Sterile Absorbent Cotton Roll (500 g)',
    manufacturer: 'Nulife',
    sku: 'PMS-SUR-COTTON',
    category: 'Surgical & Medical Supplies',
    salts: [{ name: 'Absorbent cotton', strength: 1, unit: '%' }],
    form: 'other',
    packSize: 1,
    packUnit: 'roll',
    price: 175,
    mrp: 210,
    stock: 60,
    gstRate: 5,
  },
  {
    name: 'Surgical Face Mask 3-Ply (Box of 50)',
    manufacturer: 'Medisafe',
    sku: 'PMS-SUR-MASK',
    category: 'Surgical & Medical Supplies',
    salts: [{ name: '3-ply face mask', strength: 1, unit: '%' }],
    form: 'other',
    packSize: 50,
    packUnit: 'piece',
    price: 120,
    mrp: 150,
    stock: 90,
    gstRate: 5,
  },
  {
    name: 'Latex Examination Gloves (Box of 100)',
    manufacturer: 'Medisafe',
    sku: 'PMS-SUR-GLOVES',
    category: 'Surgical & Medical Supplies',
    salts: [{ name: 'Latex examination gloves', strength: 1, unit: '%' }],
    form: 'other',
    packSize: 100,
    packUnit: 'piece',
    price: 320,
    mrp: 380,
    stock: 45,
    gstRate: 12,
  },
  {
    name: 'Digital Thermometer',
    manufacturer: 'Dr Trust',
    sku: 'PMS-SUR-THERMO',
    category: 'Surgical & Medical Supplies',
    salts: [{ name: 'Digital thermometer', strength: 1, unit: '%' }],
    form: 'other',
    packSize: 1,
    packUnit: 'unit',
    price: 199,
    mrp: 250,
    stock: 35,
    gstRate: 12,
  },
  {
    name: 'Crepe Bandage 10 cm',
    manufacturer: 'Kinche',
    sku: 'PMS-SUR-CREPE',
    category: 'Surgical & Medical Supplies',
    salts: [{ name: 'Crepe bandage', strength: 1, unit: '%' }],
    form: 'other',
    packSize: 1,
    packUnit: 'unit',
    price: 75,
    mrp: 90,
    stock: 55,
    gstRate: 12,
  },
  {
    name: 'Adhesive Bandage Strips (Pack of 100)',
    manufacturer: 'Handyplast',
    sku: 'PMS-SUR-ADHESIVE',
    category: 'Surgical & Medical Supplies',
    salts: [{ name: 'Adhesive bandage strips', strength: 1, unit: '%' }],
    form: 'other',
    packSize: 100,
    packUnit: 'piece',
    price: 99,
    mrp: 120,
    stock: 70,
    gstRate: 12,
  },
  {
    name: 'Disposable Syringe 5 ml (Box of 10)',
    manufacturer: 'Dispo Van',
    sku: 'PMS-SUR-SYRINGE5',
    category: 'Surgical & Medical Supplies',
    salts: [{ name: 'Disposable syringe', strength: 5, unit: 'ml' }],
    form: 'other',
    packSize: 10,
    packUnit: 'piece',
    price: 60,
    mrp: 75,
    stock: 65,
    gstRate: 12,
  },
  {
    name: 'Povidone-Iodine Antiseptic Solution 100 ml',
    manufacturer: 'Win-Medicare',
    sku: 'PMS-SUR-POVIODINE',
    category: 'Surgical & Medical Supplies',
    salts: [{ name: 'Povidone-Iodine', strength: 5, unit: '%' }],
    form: 'other',
    packSize: 100,
    packUnit: 'ml',
    price: 85,
    mrp: 100,
    stock: 50,
    gstRate: 12,
  },
];

async function seedCategories() {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const cat of CATEGORIES) {
    const existing = await Category.findOne({ name: cat.name });
    if (existing) {
      skipped.push(cat.name);
      continue;
    }
    const doc = new Category({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      image: '',
      isActive: true,
    });
    await doc.save();
    created.push(cat.name);
  }

  return { created, skipped };
}

async function seedProducts() {
  const categoryCache = new Map<string, mongoose.Types.ObjectId>();
  for (const cat of CATEGORIES) {
    const doc = await Category.findOne({ name: cat.name });
    if (doc) categoryCache.set(cat.name, doc._id);
  }

  const created: { name: string; sku: string }[] = [];
  const updated: { name: string; sku: string }[] = [];

  for (const data of PRODUCTS) {
    const categoryId = categoryCache.get(data.category);
    if (!categoryId) {
      console.warn(`⚠️  Skipping "${data.name}" — category "${data.category}" not found`);
      continue;
    }

    // Upsert by SKU: load existing or create new.
    const existing = await Product.findOne({ sku: data.sku });
    const doc = existing ?? new Product();

    doc.set({
      name: data.name,
      sku: data.sku,
      manufacturer: data.manufacturer,
      category: categoryId,
      salts: data.salts,
      form: data.form,
      packSize: data.packSize,
      packUnit: data.packUnit,
      price: data.price,
      mrp: data.mrp,
      stock: data.stock,
      // Supplies — no prescription needed.
      prescriptionRequired: false,
      scheduleClass: 'OTC',
      gstRate: data.gstRate,
      isActive: true,
      isDiscontinued: false,
      orderCount: 0,
      description: `${data.name} — placeholder listing, verify pack size, price and details before go-live.`,
      sideEffects: [],
      contraindications: [],
    });

    // Slug only on create so re-runs don't churn it.
    if (!existing) {
      doc.set({ slug: `${slugify(data.name)}-${slugify(data.sku)}` });
    }

    // save() triggers the pre-validate hook → compositionKey + unitPrice.
    await doc.save();

    if (existing) updated.push({ name: data.name, sku: data.sku });
    else created.push({ name: data.name, sku: data.sku });
  }

  return { created, updated };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set. Check .env.local');

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  console.log('Seeding categories...');
  const catResult = await seedCategories();
  console.log(`   Created: ${catResult.created.length}${catResult.created.length ? ` (${catResult.created.join(', ')})` : ''}`);
  if (catResult.skipped.length) console.log(`   Skipped (exist): ${catResult.skipped.join(', ')}`);

  console.log('\nSeeding products...');
  const prodResult = await seedProducts();
  console.log(`   Created: ${prodResult.created.length}`);
  prodResult.created.forEach((p) => console.log(`      ${p.name} (${p.sku})`));
  if (prodResult.updated.length) {
    console.log(`   Updated: ${prodResult.updated.length}`);
    prodResult.updated.forEach((p) => console.log(`      ${p.name} (${p.sku})`));
  }

  console.log('\n✅ Surgical & Medical Supplies seeded. Review prices/details in Admin → Products.');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
