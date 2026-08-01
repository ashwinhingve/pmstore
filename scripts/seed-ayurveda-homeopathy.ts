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
 * Seed Ayurveda & Homeopathy — starter catalogue for the two new home categories.
 *
 * The storefront now shows Ayurveda and Homeopathy tiles (src/lib/categories.ts).
 * Those tiles link to `/products?category=<name>`, so each needs a few products
 * or the tile dead-ends on the empty state. This seeds the two Category docs and
 * a handful of common, well-known OTC products under each. Prices/details are
 * best-effort PLACEHOLDERS — the shop edits them in Admin later.
 *
 * Idempotent: categories are matched by name, products upserted by SKU
 * (prefixes PMS-AYU-* / PMS-HOM-*). Each product is saved individually so the
 * pre-validate hook computes compositionKey and unitPrice (CLAUDE.md rule #2 —
 * never insertMany).
 *
 * CRITICAL: writes to whatever MONGODB_URI points to in .env.local. Dev only.
 *
 * Usage:
 *   npx tsx scripts/seed-ayurveda-homeopathy.ts
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// The two new categories. Names MUST match src/lib/categories.ts exactly.
const CATEGORIES = [
  { name: 'Ayurveda', slug: 'ayurveda', icon: '🌿' },
  { name: 'Homeopathy', slug: 'homeopathy', icon: '⚗️' },
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

// Common, recognisable OTC products. Strengths are nominal placeholders.
const PRODUCTS: SeedProduct[] = [
  // ── Ayurveda ──────────────────────────────────────────────
  {
    name: 'Dabur Chyawanprash',
    manufacturer: 'Dabur',
    sku: 'PMS-AYU-CHYAWAN',
    category: 'Ayurveda',
    salts: [{ name: 'Amla & herbal blend', strength: 500, unit: 'mg' }],
    form: 'other',
    packSize: 500,
    packUnit: 'g',
    price: 265,
    mrp: 295,
    stock: 40,
    gstRate: 5,
  },
  {
    name: 'Himalaya Ashwagandha',
    manufacturer: 'Himalaya Wellness',
    sku: 'PMS-AYU-ASHWA',
    category: 'Ayurveda',
    salts: [{ name: 'Ashwagandha (Withania somnifera)', strength: 250, unit: 'mg' }],
    form: 'tablet',
    packSize: 60,
    packUnit: 'tablet',
    price: 180,
    mrp: 210,
    stock: 50,
    gstRate: 12,
  },
  {
    name: 'Baidyanath Triphala Churna',
    manufacturer: 'Baidyanath',
    sku: 'PMS-AYU-TRIPHALA',
    category: 'Ayurveda',
    salts: [{ name: 'Triphala', strength: 1000, unit: 'mg' }],
    form: 'powder',
    packSize: 100,
    packUnit: 'g',
    price: 120,
    mrp: 140,
    stock: 45,
    gstRate: 5,
  },
  {
    name: 'Dabur Giloy Ki Ghanvati',
    manufacturer: 'Dabur',
    sku: 'PMS-AYU-GILOY',
    category: 'Ayurveda',
    salts: [{ name: 'Giloy (Tinospora cordifolia)', strength: 500, unit: 'mg' }],
    form: 'tablet',
    packSize: 60,
    packUnit: 'tablet',
    price: 150,
    mrp: 175,
    stock: 55,
    gstRate: 12,
  },

  // ── Homeopathy ────────────────────────────────────────────
  {
    name: 'SBL Arnica Montana 30 CH',
    manufacturer: 'SBL',
    sku: 'PMS-HOM-ARNICA-30',
    category: 'Homeopathy',
    salts: [{ name: 'Arnica Montana', strength: 30, unit: '%' }],
    form: 'drops',
    packSize: 30,
    packUnit: 'ml',
    price: 95,
    mrp: 110,
    stock: 60,
    gstRate: 12,
  },
  {
    name: 'SBL Nux Vomica 30 CH',
    manufacturer: 'SBL',
    sku: 'PMS-HOM-NUXVOM-30',
    category: 'Homeopathy',
    salts: [{ name: 'Nux Vomica', strength: 30, unit: '%' }],
    form: 'drops',
    packSize: 30,
    packUnit: 'ml',
    price: 95,
    mrp: 110,
    stock: 60,
    gstRate: 12,
  },
  {
    name: 'Dr. Reckeweg R6 (Cold & Flu Drops)',
    manufacturer: 'Dr. Reckeweg',
    sku: 'PMS-HOM-R6',
    category: 'Homeopathy',
    salts: [{ name: 'Homeopathic combination R6', strength: 22, unit: 'ml' }],
    form: 'drops',
    packSize: 22,
    packUnit: 'ml',
    price: 230,
    mrp: 260,
    stock: 35,
    gstRate: 12,
  },
  {
    name: 'SBL Calendula Ointment',
    manufacturer: 'SBL',
    sku: 'PMS-HOM-CALENDULA',
    category: 'Homeopathy',
    salts: [{ name: 'Calendula Officinalis', strength: 10, unit: '%' }],
    form: 'ointment',
    packSize: 25,
    packUnit: 'g',
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
      // OTC by design — Ayurvedic and homeopathic OTC products need no prescription.
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

  console.log('\n✅ Ayurveda & Homeopathy seeded. Review prices/details in Admin → Products.');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
