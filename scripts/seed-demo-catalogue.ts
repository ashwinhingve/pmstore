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
 * Seed demo catalogue — realistic pharma products and categories.
 *
 * This script seeds a demo database with:
 * - ~8 pharmacy categories (Pain relief, Antibiotics, etc.)
 * - ~12 realistic demo products across shared compositions so the Strip works
 *
 * All product SKUs are prefixed with "DEMO-" for idempotency and reversibility.
 * Each product is saved individually so the pre-save hook computes compositionKey
 * and unitPrice (CLAUDE.md rule #2).
 *
 * CRITICAL: Run this ONLY against a dev/test database — it writes to whatever
 * MONGODB_URI points to in .env.local. Never run against production.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-catalogue.ts
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Demo category data
const DEMO_CATEGORIES = [
  { name: 'Pain Relief', icon: '💊', image: 'https://images.unsplash.com/photo-1585391336339-fe39f1c69b0f?w=400' },
  { name: 'Antibiotics', icon: '🦠', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde0f?w=400' },
  { name: 'Acidity & Digestion', icon: '🫁', image: 'https://images.unsplash.com/photo-1579154204601-01d5c0d707fd?w=400' },
  { name: 'Diabetes', icon: '🩺', image: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=400' },
  { name: 'Heart & BP', icon: '❤️', image: 'https://images.unsplash.com/photo-1631217314655-e68220a2e275?w=400' },
  { name: 'Vitamins & Minerals', icon: '🌿', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde0f?w=400' },
  { name: 'Cold & Cough', icon: '🤧', image: 'https://images.unsplash.com/photo-1576091160596-112173f7f869?w=400' },
  { name: 'Allergies', icon: '👃', image: 'https://images.unsplash.com/photo-1631217314655-e68220a2e275?w=400' },
];

// Demo product data — across shared compositions for the Strip to work
const DEMO_PRODUCTS = [
  // Paracetamol 650mg (3 brands = Strip demo)
  {
    name: 'Dolo 650',
    manufacturer: 'Micro Labs',
    sku: 'DEMO-DOLO-650',
    category: 'Pain Relief',
    salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
    form: 'tablet' as const,
    packSize: 15,
    packUnit: 'tablet',
    price: 32.5,
    mrp: 45.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 100,
  },
  {
    name: 'Calpol 650',
    manufacturer: 'GlaxoSmithKline',
    sku: 'DEMO-CALPOL-650',
    category: 'Pain Relief',
    salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
    form: 'tablet' as const,
    packSize: 15,
    packUnit: 'tablet',
    price: 38.5,
    mrp: 55.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 85,
  },
  {
    name: 'Crocin 650',
    manufacturer: 'GSK',
    sku: 'DEMO-CROCIN-650',
    category: 'Pain Relief',
    salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
    form: 'tablet' as const,
    packSize: 10,
    packUnit: 'tablet',
    price: 25.0,
    mrp: 35.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 150,
  },
  // Amoxicillin 500mg (antibiotic - Schedule H)
  {
    name: 'Amoxycillin 500 Capsule',
    manufacturer: 'Alembic',
    sku: 'DEMO-AMOXY-500',
    category: 'Antibiotics',
    salts: [{ name: 'Amoxicillin', strength: 500, unit: 'mg' }],
    form: 'capsule' as const,
    packSize: 10,
    packUnit: 'capsule',
    price: 42.0,
    mrp: 60.0,
    prescriptionRequired: true,
    scheduleClass: 'H',
    stock: 60,
  },
  // Omeprazole 20mg (Acidity - OTC)
  {
    name: 'Omeprazole 20',
    manufacturer: 'Cipla',
    sku: 'DEMO-OMEP-20',
    category: 'Acidity & Digestion',
    salts: [{ name: 'Omeprazole', strength: 20, unit: 'mg' }],
    form: 'capsule' as const,
    packSize: 10,
    packUnit: 'capsule',
    price: 28.0,
    mrp: 40.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 120,
  },
  // Cetirizine 10mg (Allergy - OTC)
  {
    name: 'Cetrizine 10',
    manufacturer: 'Sun Pharma',
    sku: 'DEMO-CETRI-10',
    category: 'Allergies',
    salts: [{ name: 'Cetirizine', strength: 10, unit: 'mg' }],
    form: 'tablet' as const,
    packSize: 15,
    packUnit: 'tablet',
    price: 18.5,
    mrp: 30.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 200,
  },
  // Metformin 500mg (Diabetes)
  {
    name: 'Metformin 500 SR',
    manufacturer: 'USV',
    sku: 'DEMO-METF-500',
    category: 'Diabetes',
    salts: [{ name: 'Metformin', strength: 500, unit: 'mg' }],
    form: 'tablet' as const,
    packSize: 30,
    packUnit: 'tablet',
    price: 65.0,
    mrp: 95.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 80,
  },
  // Amlodipine 5mg (Heart & BP)
  {
    name: 'Amlodipine 5',
    manufacturer: 'Lupin',
    sku: 'DEMO-AMLOD-5',
    category: 'Heart & BP',
    salts: [{ name: 'Amlodipine', strength: 5, unit: 'mg' }],
    form: 'tablet' as const,
    packSize: 10,
    packUnit: 'tablet',
    price: 35.0,
    mrp: 50.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 110,
  },
  // Vitamin B12 1000mcg (Vitamins)
  {
    name: 'Vitamin B12 1000',
    manufacturer: 'Intas',
    sku: 'DEMO-VIT-B12-1000',
    category: 'Vitamins & Minerals',
    salts: [{ name: 'Cyanocobalamin', strength: 1000, unit: 'mcg' }],
    form: 'tablet' as const,
    packSize: 30,
    packUnit: 'tablet',
    price: 52.0,
    mrp: 75.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 90,
  },
  // Vitamin C 500mg (Vitamins)
  {
    name: 'Vitamin C 500',
    manufacturer: 'Natrol',
    sku: 'DEMO-VIT-C-500',
    category: 'Vitamins & Minerals',
    salts: [{ name: 'Ascorbic Acid', strength: 500, unit: 'mg' }],
    form: 'tablet' as const,
    packSize: 30,
    packUnit: 'tablet',
    price: 45.0,
    mrp: 65.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 130,
  },
  // Cough Syrup (Cold & Cough)
  {
    name: 'Cough Syrup',
    manufacturer: 'Benadryl',
    sku: 'DEMO-COUGH-SYRUP',
    category: 'Cold & Cough',
    salts: [{ name: 'Dextromethorphan', strength: 10, unit: 'mg' }],
    form: 'syrup' as const,
    packSize: 100,
    packUnit: 'ml',
    price: 55.0,
    mrp: 80.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 50,
  },
  // Multivitamin (Vitamins)
  {
    name: 'Multivitamin Tablets',
    manufacturer: 'Abbott',
    sku: 'DEMO-MULTIVIT',
    category: 'Vitamins & Minerals',
    salts: [{ name: 'Multivitamin Complex', strength: 1, unit: 'unit' }],
    form: 'tablet' as const,
    packSize: 30,
    packUnit: 'tablet',
    price: 85.0,
    mrp: 120.0,
    prescriptionRequired: false,
    scheduleClass: 'OTC',
    stock: 75,
  },
];

async function seedCategories() {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const cat of DEMO_CATEGORIES) {
    const existing = await Category.findOne({ name: cat.name });
    if (existing) {
      skipped.push(cat.name);
      continue;
    }

    const doc = new Category({
      name: cat.name,
      slug: slugify(cat.name),
      icon: cat.icon,
      image: cat.image,
      isActive: true,
    });

    await doc.save();
    created.push(cat.name);
  }

  return { created, skipped };
}

async function seedProducts() {
  const categoryCache = new Map<string, mongoose.Types.ObjectId>();

  // Pre-load all category IDs
  for (const cat of DEMO_CATEGORIES) {
    const doc = await Category.findOne({ name: cat.name });
    if (doc) {
      categoryCache.set(cat.name, doc._id);
    }
  }

  const created: { name: string; sku: string }[] = [];
  const updated: { name: string; sku: string }[] = [];

  for (const data of DEMO_PRODUCTS) {
    const categoryId = categoryCache.get(data.category);
    if (!categoryId) {
      console.warn(`⚠️  Skipping product "${data.name}" — category "${data.category}" not found`);
      continue;
    }

    // Upsert by SKU: load existing or create new
    const existing = await Product.findOne({ sku: data.sku });
    const doc = existing ?? new Product();

    // Set all fields
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
      prescriptionRequired: data.prescriptionRequired,
      scheduleClass: data.scheduleClass,
      gstRate: 5,
      isActive: true,
      isDiscontinued: false,
      orderCount: 0,
      description: `${data.name} - Premium quality pharmaceutical`,
      sideEffects: [],
      contraindications: [],
    });

    // Only set slug and images on create
    if (!existing) {
      doc.set({
        slug: `${slugify(data.name)}-${slugify(data.sku)}`,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde0f?w=400',
            publicId: `demo:${data.sku}:0`,
            order: 0,
          },
        ],
      });
    }

    // Save triggers the pre-save hook that computes compositionKey and unitPrice
    await doc.save();

    if (existing) {
      updated.push({ name: data.name, sku: data.sku });
    } else {
      created.push({ name: data.name, sku: data.sku });
    }
  }

  return { created, updated };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Check .env.local');
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  // Seed categories
  console.log('Seeding categories...');
  const catResult = await seedCategories();
  console.log(`   Created: ${catResult.created.length}`);
  if (catResult.created.length > 0) {
    console.log(`      ${catResult.created.join(', ')}`);
  }
  if (catResult.skipped.length > 0) {
    console.log(`   Skipped (already exist): ${catResult.skipped.length}`);
  }

  console.log('\nSeeding products...');
  const prodResult = await seedProducts();
  console.log(`   Created: ${prodResult.created.length}`);
  if (prodResult.created.length > 0) {
    prodResult.created.forEach((p) => {
      console.log(`      ${p.name} (${p.sku})`);
    });
  }
  if (prodResult.updated.length > 0) {
    console.log(`   Updated: ${prodResult.updated.length}`);
    prodResult.updated.forEach((p) => {
      console.log(`      ${p.name} (${p.sku})`);
    });
  }

  console.log('\n✅ Demo catalogue seeded successfully');
  console.log(`   Total categories: ${catResult.created.length + catResult.skipped.length}`);
  console.log(`   Total products: ${prodResult.created.length + prodResult.updated.length}`);

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
