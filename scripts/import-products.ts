import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import mongoose from 'mongoose';
import Product from '../src/models/Product';
import Category from '../src/models/Category';
import { parseProductRow, type ParsedProductRow } from '../src/lib/import/product-row';
import { parseCsv } from '../src/lib/import/csv';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Catalogue CSV importer.
 *
 * All row-level rules live in the pure, unit-tested `parseProductRow`
 * (src/lib/import/product-row.ts). This script is the I/O shell: stream the
 * file, resolve categories, `.save()` each product so the derive hook runs
 * (never insertMany), and write rejects for bad rows.
 *
 * Idempotent on `sku` — safe to re-run after fixing rejects.
 *
 * Usage:
 *   npx tsx scripts/import-products.ts data/catalogue.csv
 *
 * templates/product-import-template.csv is the contract. If the client's export
 * doesn't match, add a mapping layer in scripts/mappers/ — do not edit the template.
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const categoryCache = new Map<string, mongoose.Types.ObjectId>();

async function resolveCategory(name: string): Promise<mongoose.Types.ObjectId> {
  const key = name.toLowerCase();
  const cached = categoryCache.get(key);
  if (cached) return cached;

  let category = await Category.findOne({ name });
  if (!category) {
    category = await new Category({ name, slug: slugify(name) }).save();
  }
  categoryCache.set(key, category._id);
  return category._id;
}

/**
 * Public image URLs from the CSV. TODO(when Cloudinary is wired): upload each to
 * `pmstore/products/` and use the returned secure_url + public_id. Until then we
 * store the source URL with a deterministic placeholder publicId so the row is
 * importable; a later Cloudinary migration rewrites these.
 */
function resolveImages(imageUrls: string[], sku: string) {
  return imageUrls.map((url, i) => ({ url, publicId: `imported:${sku}:${i}` }));
}

async function upsertProduct(row: ParsedProductRow): Promise<void> {
  const category = await resolveCategory(row.categoryName);

  // Load existing by sku (idempotency) or start fresh — either way .save() runs the
  // pre-save hook that derives compositionKey and unitPrice.
  const existing = await Product.findOne({ sku: row.sku });
  const doc = existing ?? new Product();

  doc.set({
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    manufacturer: row.manufacturer,
    category,
    salts: row.salts,
    form: row.form,
    packSize: row.packSize,
    packUnit: row.packUnit,
    price: row.price,
    mrp: row.mrp,
    gstRate: row.gstRate,
    stock: row.stock,
    prescriptionRequired: row.prescriptionRequired,
    scheduleClass: row.scheduleClass,
    hsnCode: row.hsnCode,
    description: row.description,
    storageInstructions: row.storageInstructions,
    usageInstructions: row.usageInstructions,
    sideEffects: row.sideEffects,
    contraindications: row.contraindications,
    tags: row.tags,
    isActive: row.isActive,
  });

  // Only set slug/images on create so re-imports don't clobber curated edits.
  if (!existing) {
    doc.set({ slug: `${slugify(row.name)}-${slugify(row.sku)}`, images: resolveImages(row.imageUrls, row.sku) });
  } else if (!existing.images?.length && row.imageUrls.length) {
    doc.set({ images: resolveImages(row.imageUrls, row.sku) });
  }

  await doc.save();
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Usage: npx tsx scripts/import-products.ts <file.csv>');
  }
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set. Check .env.local');

  const text = readFileSync(file, 'utf8');
  const rows = parseCsv(text);
  console.log(`Parsed ${rows.length} rows from ${file}.`);

  await mongoose.connect(mongoUri);

  let imported = 0;
  const rejects: { sku: string; reason: string }[] = [];

  for (const raw of rows) {
    const result = parseProductRow(raw);
    if (!result.ok) {
      rejects.push({ sku: result.sku ?? '(no sku)', reason: result.reason });
      continue;
    }
    try {
      await upsertProduct(result.value);
      imported++;
    } catch (err) {
      rejects.push({ sku: result.value.sku, reason: (err as Error).message });
    }
  }

  if (rejects.length) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = join(__dirname, '..', 'data');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `rejects-${stamp}.csv`);
    const csv = ['sku,reason', ...rejects.map((r) => `${r.sku},"${r.reason.replace(/"/g, '""')}"`)].join('\n');
    writeFileSync(path, csv, 'utf8');
    console.log(`Rejected ${rejects.length} rows → ${path}`);
  }

  console.log(`Imported ${imported} products, ${rejects.length} rejected.`);
  console.log('Run `npx tsx scripts/backfill-composition.ts` to verify derived fields.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('import-products failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
