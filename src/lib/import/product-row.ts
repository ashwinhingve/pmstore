/**
 * Pure CSV-row → product parser for `scripts/import-products.ts`.
 *
 * No database, no Cloudinary, no side effects — it maps one raw template row to
 * either a validated product input or a reject reason. This is where every
 * import rule lives, so it can be unit-tested without a live catalogue.
 *
 * Two fields stay unresolved on purpose and are the script's job:
 *   - `categoryName` — a name here; the script upserts a Category and swaps in its ObjectId.
 *   - `imageUrls`    — public URLs; the script uploads them to Cloudinary and rewrites.
 *
 * Derived fields (`compositionKey`, `unitPrice`) are NEVER computed here — the
 * Mongoose pre-save hook owns them (docs/01-DATA-MODEL.md non-negotiable #2).
 */
import type { Salt, SaltUnit, DosageForm } from '@/lib/pharma/composition';

const SALT_UNITS: SaltUnit[] = ['mg', 'mcg', 'g', 'ml', 'iu', '%'];
const DOSAGE_FORMS: DosageForm[] = [
  'tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment',
  'gel', 'drops', 'inhaler', 'powder', 'sachet', 'spray', 'patch', 'other',
];
const SCHEDULE_CLASSES = ['OTC', 'H', 'H1', 'X', 'G'] as const;
type ScheduleClass = (typeof SCHEDULE_CLASSES)[number];

/** Schedules that legally require a prescription — never sold OTC. */
const RX_SCHEDULES: ScheduleClass[] = ['H', 'H1', 'X'];

export interface ParsedProductRow {
  sku: string;
  name: string;
  brand?: string;
  manufacturer: string;
  categoryName: string;
  salts: Salt[];
  form: DosageForm;
  packSize: number;
  packUnit: string;
  price: number;
  mrp?: number;
  gstRate: number;
  stock: number;
  prescriptionRequired: boolean;
  scheduleClass: ScheduleClass;
  hsnCode?: string;
  description: string;
  storageInstructions?: string;
  usageInstructions?: string;
  sideEffects: string[];
  contraindications: string[];
  imageUrls: string[];
  isActive: boolean;
}

export type ParseResult =
  | { ok: true; value: ParsedProductRow }
  | { ok: false; sku?: string; reason: string };

const clean = (v: string | undefined): string => (v ?? '').trim();

function toBool(v: string | undefined, fallback = false): boolean {
  const s = clean(v).toUpperCase();
  if (s === 'TRUE' || s === '1' || s === 'YES') return true;
  if (s === 'FALSE' || s === '0' || s === 'NO' || s === '') return fallback;
  return fallback;
}

function toNumber(v: string | undefined): number | null {
  const s = clean(v);
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function splitList(v: string | undefined): string[] {
  return clean(v)
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Read salt_1_*, salt_2_* … columns dynamically. Returns null on a malformed salt. */
function collectSalts(r: Record<string, string>): { salts: Salt[] } | { error: string } {
  const salts: Salt[] = [];
  for (let i = 1; ; i++) {
    const name = clean(r[`salt_${i}_name`]);
    const rawStrength = r[`salt_${i}_strength`];
    const rawUnit = r[`salt_${i}_unit`];
    // Stop when a salt slot is entirely empty AND the next index isn't present.
    if (!name && clean(rawStrength) === '' && clean(rawUnit) === '') {
      if (!(`salt_${i + 1}_name` in r)) break;
      continue;
    }
    if (!name) return { error: `salt ${i} has a strength/unit but no name` };

    const strength = toNumber(rawStrength);
    if (strength === null || strength < 0) return { error: `salt ${i} has an invalid strength` };

    const unit = clean(rawUnit) as SaltUnit;
    if (!SALT_UNITS.includes(unit)) return { error: `salt ${i} has an invalid unit "${rawUnit}"` };

    salts.push({ name, strength, unit });
  }
  return { salts };
}

export function parseProductRow(raw: Record<string, string>): ParseResult {
  const sku = clean(raw.sku);
  if (!sku) return { ok: false, reason: 'missing sku' };

  const name = clean(raw.name);
  if (!name) return { ok: false, sku, reason: 'missing name' };

  const manufacturer = clean(raw.manufacturer);
  if (!manufacturer) return { ok: false, sku, reason: 'missing manufacturer' };

  const categoryName = clean(raw.category);
  if (!categoryName) return { ok: false, sku, reason: 'missing category' };

  const form = clean(raw.form) as DosageForm;
  if (!DOSAGE_FORMS.includes(form)) return { ok: false, sku, reason: `invalid form "${raw.form}"` };

  const price = toNumber(raw.price);
  if (price === null || price < 0) return { ok: false, sku, reason: `invalid price "${raw.price}"` };

  const packSize = toNumber(raw.pack_size);
  if (packSize === null || packSize < 1) {
    return { ok: false, sku, reason: `invalid pack_size "${raw.pack_size}"` };
  }

  const packUnit = clean(raw.pack_unit) || 'unit';

  const saltResult = collectSalts(raw);
  if ('error' in saltResult) return { ok: false, sku, reason: saltResult.error };
  const { salts } = saltResult;

  const rawSchedule = clean(raw.schedule_class).toUpperCase() as ScheduleClass;
  const scheduleClass: ScheduleClass = SCHEDULE_CLASSES.includes(rawSchedule) ? rawSchedule : 'OTC';

  // A Schedule H/H1/X drug is prescription-only by law. Force the flag true even
  // if the source data says otherwise — a data-entry slip must never make an Rx
  // medicine sellable without a prescription.
  const prescriptionRequired = RX_SCHEDULES.includes(scheduleClass) || toBool(raw.prescription_required);

  // No composition → can never appear in the Strip → must not go live.
  const isActive = salts.length > 0 && toBool(raw.is_active, true);

  const description = clean(raw.short_description) || name;

  const imageUrls: string[] = [];
  for (let i = 1; `image_url_${i}` in raw; i++) {
    const url = clean(raw[`image_url_${i}`]);
    if (url) imageUrls.push(url);
  }

  const mrp = toNumber(raw.mrp);
  const gstRate = toNumber(raw.gst_rate);
  const stock = toNumber(raw.stock);

  return {
    ok: true,
    value: {
      sku,
      name,
      brand: clean(raw.brand) || undefined,
      manufacturer,
      categoryName,
      salts,
      form,
      packSize,
      packUnit,
      price,
      mrp: mrp !== null && mrp >= 0 ? mrp : undefined,
      gstRate: gstRate !== null && [0, 5, 12, 18, 28].includes(gstRate) ? gstRate : 5,
      stock: stock !== null && stock >= 0 ? stock : 0,
      prescriptionRequired,
      scheduleClass,
      hsnCode: clean(raw.hsn_code) || undefined,
      description,
      storageInstructions: clean(raw.storage_instructions) || undefined,
      usageInstructions: clean(raw.usage_instructions) || undefined,
      sideEffects: splitList(raw.side_effects),
      contraindications: splitList(raw.contraindications),
      imageUrls,
      isActive,
    },
  };
}
