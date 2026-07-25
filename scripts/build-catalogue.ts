/**
 * Build the import CSVs from `scripts/catalogue-source.ts`.
 *
 *   npx tsx scripts/build-catalogue.ts
 *
 * Emits into ./data:
 *   - catalogue-master.csv      → feed to scripts/import-products.ts
 *   - needs-review.csv          → lines that could not be identified (NOT imported)
 *   - price-verification.csv    → every SKU's assumed price for staff to confirm
 *
 * Pure I/O: it only serializes the human-reviewed source. No network, no DB.
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { MEDICINES, REVIEW, type Medicine } from './catalogue-source';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

const CATEGORY_USE: Record<string, string> = {
  'Diabetes Care': 'for blood sugar control',
  'Cardiac Care': 'for blood pressure and heart care',
  'Antibiotics': 'antibiotic for bacterial infections',
  'Pain Relief': 'for pain and fever relief',
  'Gastro': 'for digestive and stomach care',
  'Respiratory & Allergy': 'for allergy and respiratory relief',
  'Vitamins & Supplements': 'nutritional supplement',
  'Neuro & Psychiatry': 'for neurological care',
  'Ortho & Muscle Care': 'for muscle and joint care',
  'Derma & Skin': 'for skin care',
  "Gynae & Women's Health": "for women's health",
  'General & OTC': 'for general use',
};

const FORM_NOUN: Record<string, string> = {
  tablet: 'tablet', capsule: 'capsule', syrup: 'syrup', suspension: 'suspension',
  injection: 'injection', cream: 'cream', ointment: 'ointment', gel: 'gel',
  drops: 'drops', inhaler: 'inhaler', powder: 'powder', sachet: 'sachet',
  spray: 'spray', patch: 'patch', other: 'product',
};

const RX_SCHEDULES = new Set(['H', 'H1', 'X']);

function compositionLabel(med: Medicine): string {
  return med.salts.map((s) => `${s.name} ${s.strength} ${s.unit}`).join(' + ');
}

function describe(med: Medicine): string {
  const use = CATEGORY_USE[med.category] ?? 'for general use';
  const noun = FORM_NOUN[med.form] ?? 'product';
  const packWord = med.packUnit === 'ml' || med.packUnit === 'g' ? `${med.packSize} ${med.packUnit}` : `${med.packSize} ${med.packUnit}s`;
  const extra = med.note ? ` (${med.note})` : '';
  return `${compositionLabel(med)} ${noun} ${use}${extra}. Pack of ${packWord}.`;
}

function storageFor(med: Medicine): string {
  if (med.form === 'syrup' || med.form === 'suspension' || med.form === 'drops') {
    return 'Store below 25C, protected from light. Do not refrigerate. Use within one month of opening.';
  }
  return 'Store below 30C in a dry place, protected from light and moisture.';
}

function usageFor(med: Medicine): string {
  return RX_SCHEDULES.has(med.schedule)
    ? 'Use only as prescribed by your doctor.'
    : 'Use as directed on the label or by your pharmacist.';
}

// ---- CSV serialization -----------------------------------------------------

function csvCell(v: string | number | boolean | undefined): string {
  const str = v === undefined ? '' : String(v);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(header: string[], rows: (string | number | boolean | undefined)[][]): string {
  const lines = [header.join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  return lines.join('\r\n') + '\r\n';
}

// ---- SKU numbering: PMS-<PAGE><NNN>, stable by array order per page --------

function assignSkus(meds: Medicine[]): Map<Medicine, string> {
  const perPage = new Map<string, number>();
  const skus = new Map<Medicine, string>();
  for (const med of meds) {
    const n = (perPage.get(med.page) ?? 0) + 1;
    perPage.set(med.page, n);
    skus.set(med, `PMS-${med.page}${String(n).padStart(3, '0')}`);
  }
  return skus;
}

function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const skus = assignSkus(MEDICINES);
  const maxSalts = MEDICINES.reduce((max, med) => Math.max(max, med.salts.length), 0);

  // ---- catalogue-master.csv ----
  const saltCols: string[] = [];
  for (let i = 1; i <= maxSalts; i++) {
    saltCols.push(`salt_${i}_name`, `salt_${i}_strength`, `salt_${i}_unit`);
  }
  const masterHeader = [
    'sku', 'name', 'brand', 'manufacturer', 'category',
    ...saltCols,
    'form', 'pack_size', 'pack_unit', 'price', 'mrp', 'gst_rate', 'stock',
    'prescription_required', 'schedule_class', 'hsn_code', 'short_description',
    'storage_instructions', 'usage_instructions', 'side_effects', 'contraindications',
    'image_url_1', 'image_url_2', 'tags', 'is_active',
  ];

  const masterRows = MEDICINES.map((med) => {
    const sku = skus.get(med)!;
    const saltCells: (string | number)[] = [];
    for (let i = 0; i < maxSalts; i++) {
      const salt = med.salts[i];
      saltCells.push(salt?.name ?? '', salt ? salt.strength : '', salt?.unit ?? '');
    }
    return [
      sku,
      med.name,
      med.brand ?? med.name.split(' ')[0],
      med.manufacturer,
      med.category,
      ...saltCells,
      med.form,
      med.packSize,
      med.packUnit,
      med.price.toFixed(2),
      med.price.toFixed(2), // mrp == price: no fabricated discount
      med.gstRate ?? 12,
      40, // best-effort default stock; staff adjusts
      RX_SCHEDULES.has(med.schedule) ? 'TRUE' : 'FALSE',
      med.schedule,
      med.hsnCode ?? '30049099',
      describe(med),
      storageFor(med),
      usageFor(med),
      '', // side_effects — left blank rather than fabricated
      '', // contraindications — left blank rather than fabricated
      '', // image_url_1 — placeholders generated post-import
      '',
      'price-unverified',
      'TRUE',
    ];
  });

  writeFileSync(join(DATA_DIR, 'catalogue-master.csv'), toCsv(masterHeader, masterRows), 'utf8');

  // ---- needs-review.csv ----
  const reviewHeader = ['page', 'raw_text', 'best_guess', 'reason'];
  const reviewRows = REVIEW.map((r) => [r.page, r.raw, r.bestGuess, r.reason]);
  writeFileSync(join(DATA_DIR, 'needs-review.csv'), toCsv(reviewHeader, reviewRows), 'utf8');

  // ---- price-verification.csv ----
  const priceHeader = [
    'sku', 'name', 'brand', 'manufacturer', 'category',
    'composition', 'pack_size', 'pack_unit',
    'assumed_price_inr', 'verified_price_inr', 'note',
  ];
  const priceRows = MEDICINES.map((med) => [
    skus.get(med)!,
    med.name,
    med.brand ?? med.name.split(' ')[0],
    med.manufacturer,
    med.category,
    compositionLabel(med),
    med.packSize,
    med.packUnit,
    med.price.toFixed(2),
    '', // verified_price_inr — staff fills this in
    'Price and pack size are best-effort estimates. Confirm against the physical pack.',
  ]);
  writeFileSync(join(DATA_DIR, 'price-verification.csv'), toCsv(priceHeader, priceRows), 'utf8');

  // ---- summary ----
  const byPage = new Map<string, number>();
  for (const med of MEDICINES) byPage.set(med.page, (byPage.get(med.page) ?? 0) + 1);
  const pageBreakdown = [...byPage.entries()].sort().map(([p, n]) => `${p}:${n}`).join('  ');

  console.log('Catalogue built:');
  console.log(`  ${MEDICINES.length} products  ->  data/catalogue-master.csv  (max ${maxSalts} salts)`);
  console.log(`  ${REVIEW.length} flagged     ->  data/needs-review.csv  (NOT imported)`);
  console.log(`  ${MEDICINES.length} rows       ->  data/price-verification.csv`);
  console.log(`  per page: ${pageBreakdown}`);
  console.log('Next: npx tsx scripts/import-products.ts data/catalogue-master.csv');
}

main();
