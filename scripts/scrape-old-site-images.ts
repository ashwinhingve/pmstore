import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import mongoose from 'mongoose';
import Product from '../src/models/Product';

// Load .env.local (MONGODB_URI) before touching the DB.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Match our catalogue to the old WooCommerce store's real pack shots.
 *
 * The old live site (pratigyamedicalstore.in) is WooCommerce and exposes the
 * public Store API — so instead of scraping HTML we pull name + slug + image
 * straight from /wp-json/wc/store/v1/products, then fuzzy-match each of our
 * products by name.
 *
 * Output: data/old-site-image-candidates.csv for a HUMAN to review. Getting the
 * strength wrong on a pharmacy (Azulix 1 MF vs 2 MF) shows the wrong pack, which
 * is a safety problem — so rows whose numeric tokens don't match are never
 * auto-approved. Review the 'approved' column, then run upload-product-images.ts.
 *
 * Usage:
 *   npx tsx scripts/scrape-old-site-images.ts
 */

const WC_BASE = 'https://pratigyamedicalstore.in/wp-json/wc/store/v1/products';
const PER_PAGE = 100;
const MAX_PAGES = 60; // safety stop
const AUTO_APPROVE_CONFIDENCE = 0.7;

interface WcProduct {
  name: string;
  slug: string;
  images?: { src: string }[];
}

interface OurProduct {
  sku: string;
  name: string;
  slug: string;
  hasRealImage: boolean;
}

/** Strip dosage-form/unit noise but KEEP numbers — strength matters. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—]/g, '-')
    // Split a unit glued to a number so "250mg"/"5ml" become "250 mg"/"5 ml"
    // and the unit word can then be stripped (leaving the bare strength).
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/\b(tab|tablet|tablets|cap|capsule|capsules|syrup|susp|suspension|inj|injection|drop|drops|cream|gel|ointment|liquid|kit|duo|mg|ml|mcg|gm|gms|g|iu|the|copy|new)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean);
}

function numbersOf(toks: string[]): string[] {
  return toks.filter((t) => /\d/.test(t)).sort();
}

/** Jaccard token overlap, demoted when strength numbers differ. */
function score(aToks: string[], bToks: string[]): { confidence: number; numbersMatch: boolean } {
  const a = new Set(aToks);
  const b = new Set(bToks);
  const inter = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size || 1;
  const jaccard = inter / union;

  const aNums = numbersOf(aToks);
  const bNums = numbersOf(bToks);
  const numbersMatch = aNums.length === bNums.length && aNums.every((n, i) => n === bNums[i]);

  // If either side carries a strength number and they disagree, this is a
  // different product — cap confidence so it can never auto-approve.
  const confidence = !numbersMatch && (aNums.length || bNums.length)
    ? Math.min(jaccard, 0.4)
    : jaccard;

  return { confidence: Number(confidence.toFixed(3)), numbersMatch };
}

function csvCell(v: string | number | boolean): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function fetchAllWcProducts(): Promise<WcProduct[]> {
  const all: WcProduct[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${WC_BASE}?per_page=${PER_PAGE}&page=${page}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      if (res.status === 400 || res.status === 404) break; // past the last page
      throw new Error(`WooCommerce API HTTP ${res.status} on page ${page}`);
    }
    const batch = (await res.json()) as WcProduct[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return all;
}

function isRealImage(images: { url: string }[] | undefined): boolean {
  if (!images || images.length === 0) return false;
  return images.some((img) => img.url && !img.url.includes('/placeholder-') && !/^imported:/.test((img as any).publicId ?? ''));
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set (need .env.local)');

  console.log('Fetching products from the old WooCommerce store…');
  const wc = await fetchAllWcProducts();
  const wcWithImages = wc.filter((p) => p.images?.[0]?.src);
  console.log(`  ${wc.length} products, ${wcWithImages.length} with an image.`);

  const wcIndexed = wcWithImages.map((p) => ({ p, toks: tokens(p.name) }));

  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await Product.find({ isActive: true }, { sku: 1, name: 1, slug: 1, images: 1 }).lean();
  const ours: OurProduct[] = docs.map((d: any) => ({
    sku: d.sku,
    name: d.name,
    slug: d.slug,
    hasRealImage: isRealImage(d.images),
  }));
  console.log(`  ${ours.length} of our catalogue products.`);

  const rows: string[] = [
    ['sku', 'ourName', 'ourSlug', 'currentlyHasRealImage', 'matchedName', 'confidence', 'numbersMatch', 'imageUrl', 'approved'].join(','),
  ];

  let auto = 0;
  let matched = 0;
  for (const p of ours) {
    const pToks = tokens(p.name);
    let best: { wc: WcProduct; confidence: number; numbersMatch: boolean } | null = null;
    for (const { p: cand, toks: cToks } of wcIndexed) {
      const { confidence, numbersMatch } = score(pToks, cToks);
      if (!best || confidence > best.confidence) best = { wc: cand, confidence, numbersMatch };
    }

    const imageUrl = best?.wc.images?.[0]?.src ?? '';
    const confidence = best?.confidence ?? 0;
    const numbersMatch = best?.numbersMatch ?? false;
    const approved = !p.hasRealImage && confidence >= AUTO_APPROVE_CONFIDENCE && numbersMatch ? 'yes' : '';
    if (imageUrl && confidence > 0) matched++;
    if (approved === 'yes') auto++;

    rows.push(
      [
        csvCell(p.sku),
        csvCell(p.name),
        csvCell(p.slug),
        csvCell(p.hasRealImage),
        csvCell(best?.wc.name ?? ''),
        csvCell(confidence),
        csvCell(numbersMatch),
        csvCell(imageUrl),
        csvCell(approved),
      ].join(',')
    );
  }

  const outDir = join(__dirname, '..', 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'old-site-image-candidates.csv');
  writeFileSync(outPath, rows.join('\n'), 'utf8');

  await mongoose.disconnect();

  console.log('');
  console.log(`Wrote ${outPath}`);
  console.log(`  ${matched}/${ours.length} products got a candidate match.`);
  console.log(`  ${auto} pre-approved (confidence ≥ ${AUTO_APPROVE_CONFIDENCE} + strength matches).`);
  console.log('');
  console.log('NEXT: open the CSV, verify each pack shot is the right brand AND strength,');
  console.log("set approved=yes on the rows you trust, then run:");
  console.log('  npx tsx scripts/upload-product-images.ts');
}

main().catch((err) => {
  console.error('scrape-old-site-images failed:', err);
  process.exit(1);
});
