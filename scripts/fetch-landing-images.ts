/**
 * One-time downloader for the landing-page photography.
 *
 * The landing imagery used to be hotlinked from images.unsplash.com, which is
 * fragile in production (hotlink throttling, no next/image optimization, and it
 * blanks sections in the Capacitor WebView app). This script pulls the curated
 * set into `public/landing/` with stable names so `src/lib/landing-images.ts`
 * can reference `/landing/*` locally.
 *
 * Run once (idempotent — re-downloads and overwrites):
 *   npx tsx scripts/fetch-landing-images.ts
 *
 * All photos are Unsplash-licence (royalty-free, commercial, no attribution
 * required). Sizes are baked into each query string per use.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'public', 'landing');
const U = 'https://images.unsplash.com';

/** filename in public/landing → source URL */
const IMAGES: Record<string, string> = {
  // Hero slider backgrounds (~1920px)
  'hero-1.jpg': `${U}/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=1920&q=80`,
  'hero-2.jpg': `${U}/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1920&q=80`,
  'hero-3.jpg': `${U}/photo-1580281657527-47f249e8f4df?auto=format&fit=crop&w=1920&q=80`,
  'hero-4.jpg': `${U}/photo-1625690987114-86f5af994b49?auto=format&fit=crop&w=1920&q=80`,
  'hero-5.jpg': `${U}/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=1920&q=80`,

  // Category cards (~800px), keyed by slug
  'category-pain-relief.jpg': `${U}/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=800&q=80`,
  'category-cardiac-care.jpg': `${U}/photo-1690787628851-d36e285c29b0?auto=format&fit=crop&w=800&q=80`,
  'category-diabetes-care.jpg': `${U}/photo-1685485276223-0bb0226dcca8?auto=format&fit=crop&w=800&q=80`,
  'category-antibiotics.jpg': `${U}/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80`,
  'category-respiratory-allergy.jpg': `${U}/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80`,
  'category-gastro.jpg': `${U}/photo-1576602975754-efdf313b9342?auto=format&fit=crop&w=800&q=80`,
  'category-vitamins-supplements.jpg': `${U}/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80`,
  'category-neuro-psychiatry.jpg': `${U}/photo-1526724038726-3007ffb8025f?auto=format&fit=crop&w=800&q=80`,
  'category-ortho-muscle-care.jpg': `${U}/photo-1778826393424-2e063bf5fd64?auto=format&fit=crop&w=800&q=80`,
  'category-derma-skin.jpg': `${U}/photo-1730288951113-9cc087c14b83?auto=format&fit=crop&w=800&q=80`,
  'category-general-otc.jpg': `${U}/photo-1562243061-204550d8a2c9?auto=format&fit=crop&w=800&q=80`,

  // Promo banners (~1600px)
  'promo-rx.jpg': `${U}/photo-1580281658223-9b93f18ae9ae?auto=format&fit=crop&w=1600&q=80`,
  'promo-reorder.jpg': `${U}/photo-1758691031621-f6870f9f998a?auto=format&fit=crop&w=1600&q=80`,

  // Trust / lifestyle (~1200px)
  'trust-1.jpg': `${U}/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=80`,
  'trust-2.jpg': `${U}/photo-1576671081837-49000212a370?auto=format&fit=crop&w=1200&q=80`,
  'trust-3.jpg': `${U}/photo-1559234938-b60fff04894d?auto=format&fit=crop&w=1200&q=80`,
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const entries = Object.entries(IMAGES);
  let ok = 0;
  const failed: string[] = [];

  for (const [name, url] of entries) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (pmstore landing image fetch)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 1024) throw new Error(`suspiciously small (${buf.byteLength}B)`);
      await writeFile(join(OUT_DIR, name), buf);
      ok += 1;
      console.log(`  ok  ${name}  (${Math.round(buf.byteLength / 1024)}KB)`);
    } catch (err) {
      failed.push(name);
      console.error(`  FAIL ${name}: ${(err as Error).message}`);
    }
  }

  console.log(`\nDownloaded ${ok}/${entries.length} into public/landing/`);
  if (failed.length) {
    console.error(`Failed: ${failed.join(', ')}`);
    process.exit(1);
  }
}

main();
