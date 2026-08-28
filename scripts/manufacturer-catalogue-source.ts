/**
 * Catalogue source for the 88-manufacturer product research (client's 3 WhatsApp
 * photos of a handwritten supplier list, 2026-08-18/21). Mirrors the shape and
 * rules of `scripts/catalogue-source.ts` but is generated from
 * `data/manufacturer-research-raw.json` (web-researched flagship products, 5-8
 * per company) instead of hand-authored line by line.
 *
 * RULES FOLLOWED (see CLAUDE.md):
 *  - Never fabricate a manufacturer identity. Every `manufacturer` here must
 *    match a canonical name in `data/manufacturers.json` exactly (after a small
 *    known-alias correction) or the row goes to REVIEW, not MEDICINES.
 *  - Prices/pack sizes are best-effort web research, not verified stock data.
 *    Every row is tagged `price-unverified` downstream. `price` == `mrp`.
 *  - Schedule H/H1/X => prescriptionRequired is forced true by the importer.
 *  - category/form/salt-unit must match the site's existing enums — anything
 *    that doesn't goes to REVIEW rather than being silently coerced.
 *
 * SKU scheme: PMS-<PAGE><NNN>, page = research batch code (M1..M9).
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import type { Medicine, ReviewItem, SourceSalt, Form, Schedule, Unit } from './catalogue-source';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CANONICAL_MANUFACTURERS: string[] = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'manufacturers.json'), 'utf8'),
);
const CANONICAL_SET = new Set(CANONICAL_MANUFACTURERS.map((n) => n.toLowerCase()));

// Manufacturer names a research agent wrote slightly differently than the
// client's canonical list. Resolved by hand against `data/manufacturers.json`.
const MANUFACTURER_ALIASES: Record<string, string> = {
  'apex laboratories': 'Apex',
  'blue cross laboratories': 'Blue Cross',
};

// The 15 category names actually in use in the DB (queried directly, not just
// the nav list in src/lib/categories.ts). Anything outside this set is not a
// real category and must not silently create a stray one.
const CANONICAL_CATEGORIES = new Set([
  'Antibiotics', 'Ayurveda', 'Cardiac Care', 'Cholesterol', 'Derma & Skin',
  'Diabetes Care', 'Gastro', 'General & OTC', 'Homeopathy',
  'Neuro & Psychiatry', 'Ortho & Muscle Care', 'Pain Relief',
  'Respiratory & Allergy', 'Surgical & Medical Supplies', 'Vitamins & Supplements',
]);

const VALID_FORMS: Set<Form> = new Set([
  'tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment',
  'gel', 'drops', 'inhaler', 'powder', 'sachet', 'spray', 'patch', 'other',
]);
const VALID_UNITS: Set<Unit> = new Set(['mg', 'mcg', 'g', 'ml', 'iu', '%']);
const VALID_SCHEDULES: Set<Schedule> = new Set(['OTC', 'H', 'H1', 'X', 'G']);

interface RawEntry {
  page: string;
  raw: string;
  name: string;
  manufacturer: string;
  category: string;
  salts: { name: string; strength: number; unit: string }[];
  form: string;
  packSize: number;
  packUnit: string;
  price: number;
  schedule: string;
}

const rawEntries: RawEntry[] = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'manufacturer-research-raw.json'), 'utf8'),
);

function resolveManufacturer(name: string): string | null {
  const lower = name.trim().toLowerCase();
  if (CANONICAL_SET.has(lower)) {
    return CANONICAL_MANUFACTURERS.find((n) => n.toLowerCase() === lower)!;
  }
  const alias = MANUFACTURER_ALIASES[lower];
  if (alias && CANONICAL_SET.has(alias.toLowerCase())) {
    return CANONICAL_MANUFACTURERS.find((n) => n.toLowerCase() === alias.toLowerCase())!;
  }
  return null;
}

const MEDICINES: Medicine[] = [];
const REVIEW: ReviewItem[] = [];
const seen = new Set<string>(); // dedupe by lowercase name+form

for (const entry of rawEntries) {
  const manufacturer = resolveManufacturer(entry.manufacturer);
  if (!manufacturer) {
    REVIEW.push({
      page: entry.page,
      raw: entry.raw,
      bestGuess: `${entry.name} (${entry.manufacturer})`,
      reason: `manufacturer "${entry.manufacturer}" is not in the client's 87-name list`,
    });
    continue;
  }

  if (!CANONICAL_CATEGORIES.has(entry.category)) {
    REVIEW.push({
      page: entry.page,
      raw: entry.raw,
      bestGuess: entry.name,
      reason: `category "${entry.category}" is not a real site category`,
    });
    continue;
  }

  if (!VALID_FORMS.has(entry.form as Form)) {
    REVIEW.push({
      page: entry.page,
      raw: entry.raw,
      bestGuess: entry.name,
      reason: `form "${entry.form}" is not in the supported dosage-form list`,
    });
    continue;
  }

  if (!VALID_SCHEDULES.has(entry.schedule as Schedule)) {
    REVIEW.push({
      page: entry.page,
      raw: entry.raw,
      bestGuess: entry.name,
      reason: `schedule "${entry.schedule}" is not a recognized schedule class`,
    });
    continue;
  }

  const badSalt = entry.salts.find((s) => !VALID_UNITS.has(s.unit as Unit));
  if (badSalt || entry.salts.length === 0) {
    REVIEW.push({
      page: entry.page,
      raw: entry.raw,
      bestGuess: entry.name,
      reason: badSalt
        ? `salt "${badSalt.name}" has unsupported unit "${badSalt.unit}"`
        : 'no salt composition given',
    });
    continue;
  }

  const dedupeKey = `${entry.name.trim().toLowerCase()}|${entry.form}`;
  if (seen.has(dedupeKey)) {
    REVIEW.push({
      page: entry.page,
      raw: entry.raw,
      bestGuess: entry.name,
      reason: 'duplicate name+form already present in an earlier batch',
    });
    continue;
  }
  seen.add(dedupeKey);

  const salts: SourceSalt[] = entry.salts.map((s) => ({
    name: s.name,
    strength: s.strength,
    unit: s.unit as Unit,
  }));

  MEDICINES.push({
    page: entry.page,
    raw: entry.raw,
    name: entry.name,
    manufacturer,
    category: entry.category,
    salts,
    form: entry.form as Form,
    packSize: entry.packSize,
    packUnit: entry.packUnit,
    price: entry.price,
    schedule: entry.schedule as Schedule,
  });
}

export { MEDICINES, REVIEW };
