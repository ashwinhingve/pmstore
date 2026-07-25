/**
 * Generate a clean, consistent placeholder image for every product that has none,
 * and upload it to Cloudinary. Real pack photography replaces these later through
 * the admin ImageUploader — this just guarantees no product renders imageless.
 *
 *   npx tsx scripts/generate-product-images.ts            # only products with no image
 *   npx tsx scripts/generate-product-images.ts --force    # also regenerate existing placeholders
 *   npx tsx scripts/generate-product-images.ts --dry-run  # build + report, no upload, no DB write
 *   npx tsx scripts/generate-product-images.ts --limit 5  # cap how many are processed
 *
 * The card is a hand-built SVG (brand tokens from src/styles/tokens.css). Cloudinary
 * rasterizes it to PNG on upload (`format: 'png'`), so what we store and deliver is a
 * real raster — no SVG delivery, no `sharp` dependency, no native binaries.
 *
 * Images are NOT derived fields, so writing them back with `.save()` is safe: the
 * pre-validate hook recomputes compositionKey/unitPrice only when salts/price change,
 * which they don't here (CLAUDE.md rule #2 respected).
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import Product from '../src/models/Product';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const FOLDER = 'pmstore/products';
const PLACEHOLDER_PREFIX = /^(placeholder-|imported:)/;

// Brand tokens (src/styles/tokens.css)
const C = {
  ink: '#16233A',
  ink70: '#56607A',
  ink40: '#9AA2B4',
  paper: '#FBFAF7',
  card: '#FFFFFF',
  foil: '#C9CFD6',
  foilSoft: '#E9ECEF',
  mint: '#0E8F6E',
  mintSoft: '#E4F3ED',
  rx: '#B23A34',
  rxSoft: '#FAECEA',
};

const FONT = "Arial, 'DejaVu Sans', 'Helvetica Neue', sans-serif";

interface LeanProduct {
  _id: unknown;
  name: string;
  sku: string;
  form?: string;
  prescriptionRequired?: boolean;
  salts?: { name: string; strength: number; unit: string }[];
  images?: { publicId?: string }[];
}

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}

/** Greedy word-wrap into at most `maxLines` lines of ~`maxChars` characters. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  // Anything that didn't fit gets an ellipsis on the last line.
  const consumed = lines.join(' ').split(/\s+/).length;
  if (consumed < words.length && lines.length) lines[lines.length - 1] += '…';
  return lines;
}

function strengthLabel(p: LeanProduct): string {
  const salts = p.salts ?? [];
  if (!salts.length) return '';
  const first = `${salts[0].name} ${salts[0].strength} ${salts[0].unit}`;
  return salts.length > 1 ? `${first}  +${salts.length - 1} more` : first;
}

function buildSvg(p: LeanProduct): string {
  const form = (p.form ?? 'product').toUpperCase();
  const nameLines = wrap(p.name, 15, 3);
  const nameFont = nameLines.length >= 3 ? 46 : nameLines.length === 2 ? 54 : 62;
  const strength = strengthLabel(p);
  const rx = Boolean(p.prescriptionRequired);

  // Vertically center the name block around y=310.
  const lineGap = nameFont + 10;
  const startY = 310 - ((nameLines.length - 1) * lineGap) / 2;
  const nameTspans = nameLines
    .map((ln, i) => `<text x="300" y="${startY + i * lineGap}" text-anchor="middle" font-family="${FONT}" font-size="${nameFont}" font-weight="700" fill="${C.ink}">${xmlEscape(ln)}</text>`)
    .join('');

  const formPill = `
    <rect x="228" y="150" width="144" height="40" rx="20" fill="${C.mintSoft}"/>
    <text x="300" y="176" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" letter-spacing="2" fill="${C.mint}">${xmlEscape(form)}</text>`;

  const strengthText = strength
    ? `<text x="300" y="392" text-anchor="middle" font-family="${FONT}" font-size="24" fill="${C.ink70}">${xmlEscape(strength)}</text>`
    : '';

  const rxBadge = rx
    ? `<circle cx="512" cy="88" r="30" fill="${C.rxSoft}"/>
       <text x="512" y="99" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="700" fill="${C.rx}">℞</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="${C.paper}"/>
  <rect x="28" y="28" width="544" height="544" rx="28" fill="${C.card}" stroke="${C.foilSoft}" stroke-width="2"/>
  <circle cx="300" cy="300" r="150" fill="${C.mintSoft}" opacity="0.35"/>
  ${formPill}
  ${nameTspans}
  ${strengthText}
  ${rxBadge}
  <text x="300" y="520" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="600" letter-spacing="3" fill="${C.ink40}">PRATIGYA MEDICAL STORE</text>
</svg>`;
}

function dataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function needsImage(p: LeanProduct, force: boolean): boolean {
  const imgs = p.images ?? [];
  if (imgs.length === 0) return true;
  if (force && imgs.every((im) => PLACEHOLDER_PREFIX.test(im.publicId ?? ''))) return true;
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? '0', 10) : 0;

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set. Check .env.local');

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!dryRun && !(cloud && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
    throw new Error('Cloudinary credentials are not set. Check .env.local (or use --dry-run).');
  }
  cloudinary.config({
    cloud_name: cloud,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  await mongoose.connect(mongoUri);

  const all = await Product.find({})
    .select('_id name sku form prescriptionRequired salts images')
    .lean<LeanProduct[]>();

  let targets = all.filter((p) => needsImage(p, force));
  if (limit > 0) targets = targets.slice(0, limit);

  console.log(`${all.length} products total, ${targets.length} need a placeholder${force ? ' (force)' : ''}${dryRun ? ' [dry-run]' : ''}.`);

  let done = 0;
  const failures: { sku: string; reason: string }[] = [];

  for (const p of targets) {
    const svg = buildSvg(p);
    if (dryRun) {
      console.log(`  would generate placeholder-${p.sku.toLowerCase()}  (${p.name})`);
      done++;
      continue;
    }
    try {
      const res = await cloudinary.uploader.upload(dataUri(svg), {
        folder: FOLDER,
        public_id: `placeholder-${p.sku.toLowerCase()}`,
        overwrite: true,
        invalidate: true,
        format: 'png',
        resource_type: 'image',
      });

      // Save via the document so validation runs; images aren't derived so the
      // hook recomputes nothing here.
      const doc = await Product.findById(p._id);
      if (!doc) throw new Error('product vanished between query and update');
      doc.images = [
        {
          url: res.secure_url,
          publicId: res.public_id,
          width: res.width,
          height: res.height,
          format: res.format,
          order: 0,
        },
      ] as any;
      await doc.save();
      done++;
      if (done % 20 === 0) console.log(`  …${done}/${targets.length}`);
    } catch (err) {
      failures.push({ sku: p.sku, reason: (err as Error).message });
    }
  }

  console.log(`Done. ${done} image${done === 1 ? '' : 's'} ${dryRun ? 'previewed' : 'generated & uploaded'}, ${failures.length} failed.`);
  if (failures.length) {
    for (const f of failures.slice(0, 20)) console.log(`  FAILED ${f.sku}: ${f.reason}`);
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('generate-product-images failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
