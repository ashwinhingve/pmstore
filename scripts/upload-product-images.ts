import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import Product from '../src/models/Product';
import { parseCsv } from '../src/lib/import/csv';

// Load .env.local (MONGODB_URI + CLOUDINARY_*) before anything reads env.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Upload approved pack shots to Cloudinary and attach them to products.
 *
 * Reads data/old-site-image-candidates.csv (produced + reviewed after
 * scrape-old-site-images.ts) and, for every row with approved=yes, uploads the
 * image to Cloudinary's pmstore/products folder and sets it as the product's
 * image. Uses .save() so the derive hook runs — NEVER updateMany/insertMany
 * (that skips the hook and breaks compositionKey/unitPrice; see CLAUDE.md).
 *
 * Idempotent: a product that already has a real (non-placeholder) image is
 * skipped unless --force. Designed tiles remain the fallback for anything with
 * no real image.
 *
 *   npx tsx scripts/upload-product-images.ts [--dry-run] [--force] [--file <csv>]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const fileArgIdx = process.argv.indexOf('--file');
const CSV_PATH = fileArgIdx !== -1 && process.argv[fileArgIdx + 1]
  ? process.argv[fileArgIdx + 1]
  : join(__dirname, '..', 'data', 'old-site-image-candidates.csv');

function hasRealImage(images: any[] | undefined): boolean {
  if (!images || images.length === 0) return false;
  return images.some(
    (img) => img?.url && !img.url.includes('/placeholder-') && !/^imported:/.test(img.publicId ?? '')
  );
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set (need .env.local)');
  for (const v of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    if (!process.env[v]) throw new Error(`${v} not set (need .env.local)`);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const approved = rows.filter((r) => r.approved?.trim().toLowerCase() === 'yes' && r.imageUrl?.trim());
  console.log(`${approved.length} approved rows in ${CSV_PATH}${DRY_RUN ? ' (dry run)' : ''}\n`);

  await mongoose.connect(process.env.MONGODB_URI);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of approved) {
    const sku = row.sku.trim();
    const product = await Product.findOne({ sku });
    if (!product) {
      console.log(`  ✗ ${sku} — not found in catalogue`);
      failed++;
      continue;
    }
    if (hasRealImage(product.images) && !FORCE) {
      console.log(`  • ${sku} (${product.name}) — already has a real image, skipping`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  → ${sku} (${product.name}) would upload ${row.imageUrl}`);
      uploaded++;
      continue;
    }

    try {
      const result = await cloudinary.uploader.upload(row.imageUrl.trim(), {
        folder: 'pmstore/products',
        public_id: sku,
        overwrite: true,
        resource_type: 'image',
      });
      product.images = [
        {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          order: 0,
        },
      ] as any;
      await product.save(); // runs the derive hook
      console.log(`  ✓ ${sku} (${product.name}) → ${result.secure_url}`);
      uploaded++;
    } catch (err: any) {
      console.log(`  ✗ ${sku} (${product.name}) — ${err.message}`);
      failed++;
    }
  }

  await mongoose.disconnect();

  console.log('');
  console.log(`Done. ${uploaded} ${DRY_RUN ? 'to upload' : 'uploaded'}, ${skipped} skipped, ${failed} failed.`);
}

main().catch((err) => {
  console.error('upload-product-images failed:', err);
  process.exit(1);
});
