import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import Prescription from '../src/models/Prescription';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * One-time migration: flip every existing prescription image's Cloudinary
 * `access_mode` from the historical default ('public') to 'authenticated', so
 * they're no longer retrievable by a plain URL — only via a signed request
 * minted server-side (see signedImageUrl() in src/lib/cloudinary/config.ts).
 *
 * New uploads already set `access_mode: 'authenticated'` at upload time
 * (src/app/api/prescriptions/route.ts) — this script only needs to run once,
 * against whatever prescriptions existed before that code shipped.
 *
 * Idempotent: setting access_mode on an asset that's already 'authenticated'
 * is a harmless no-op, so this is safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/migrate-prescription-images-private.ts             (dry run — lists counts only)
 *   npx tsx scripts/migrate-prescription-images-private.ts --apply     (actually mutates Cloudinary)
 *
 * Never logs a public_id, URL, or any prescription content (root CLAUDE.md
 * rule #6) — only counts.
 */

const APPLY = process.argv.includes('--apply');
const DELAY_MS = 250; // pace Admin API calls well under free-tier rate limits

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function migrate() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set. Check .env.local');
  }
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Cloudinary environment variables are not set. Check .env.local');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');
  console.log(APPLY ? '⚠️  APPLY mode — Cloudinary assets will be updated.\n' : 'ℹ️  Dry run — pass --apply to actually update Cloudinary.\n');

  const prescriptions = await Prescription.find({}, { images: 1 }).lean();

  const publicIds: string[] = [];
  for (const p of prescriptions) {
    for (const img of (p as any).images ?? []) {
      if (img?.publicId) publicIds.push(img.publicId);
    }
  }

  console.log(`Found ${prescriptions.length} prescriptions, ${publicIds.length} images total.\n`);

  if (!APPLY) {
    console.log('Dry run complete — nothing changed. Re-run with --apply to migrate.');
    await mongoose.disconnect();
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (const publicId of publicIds) {
    try {
      await cloudinary.api.update(publicId, {
        resource_type: 'image',
        access_mode: 'authenticated',
      });
      succeeded++;
    } catch (err: any) {
      failed++;
      // Log the error message only — never the public_id (rule #6).
      console.warn(`⚠️  One image failed to migrate: ${err?.message || 'unknown error'}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n📊 Migration summary:`);
  console.log(`   ✅ Migrated: ${succeeded}/${publicIds.length}`);
  if (failed) console.log(`   ⚠️  Failed:   ${failed}/${publicIds.length}`);

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
