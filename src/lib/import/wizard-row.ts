/**
 * The import wizard's row model and the pure transforms around it.
 *
 * A "working row" is keyed by the friendly CANONICAL_FIELDS keys (sku, name,
 * composition, manufacturer, …) — composition is kept as a single shorthand
 * string ("Paracetamol 650mg + Caffeine 50mg") because that's what a human
 * edits. Only at the very end is a working row serialized to the canonical CSV
 * the server's parseProductRow understands, expanding composition into the
 * salt_* columns. Everything here is pure and DB-free so it is unit-testable.
 */
import { CANONICAL_FIELDS } from './column-detect';
import {
  parseCompositionShorthand,
  saltsToshorthand,
  normalizeAndValidateForm,
} from './composition-shorthand-parser';
import { toCsv } from './csv-parse';
import type { Salt } from '@/lib/pharma/composition';

export type WorkingRow = Record<string, string>;

/** GST slabs the importer accepts; anything else quietly defaults to 5%. */
const GST_SLABS = [0, 5, 12, 18, 28];

/** Canonical CSV header order emitted for the server (salt_* expanded). */
export const CANONICAL_CSV_HEADERS = [
  'sku', 'name', 'manufacturer', 'category', 'form', 'price', 'pack_size', 'pack_unit',
  'mrp', 'stock', 'brand', 'schedule_class', 'prescription_required', 'hsn_code',
  'gst_rate', 'short_description', 'tags', 'is_active', 'image_url_1',
  'salt_1_name', 'salt_1_strength', 'salt_1_unit',
  'salt_2_name', 'salt_2_strength', 'salt_2_unit',
  'salt_3_name', 'salt_3_strength', 'salt_3_unit',
];

/** Read any pre-split salt_N_* columns from a raw row (for re-importing exports). */
function readRawSalts(raw: Record<string, string>): Salt[] {
  const salts: Salt[] = [];
  for (let i = 1; i <= 4; i++) {
    const name = (raw[`salt_${i}_name`] ?? '').trim();
    if (!name) continue;
    const strength = Number((raw[`salt_${i}_strength`] ?? '').trim());
    const unit = (raw[`salt_${i}_unit`] ?? 'mg').trim();
    salts.push({ name, strength: Number.isFinite(strength) ? strength : 0, unit: unit as Salt['unit'] });
  }
  return salts;
}

/**
 * Apply a column mapping to raw spreadsheet rows, producing working rows. A
 * composition that wasn't mapped but has split salt_* columns in the source
 * (our own export, re-imported) is rebuilt into the shorthand string.
 */
export function toWorkingRows(
  rawRows: Record<string, string>[],
  mapping: Record<string, string | null>,
): WorkingRow[] {
  return rawRows.map((raw) => {
    const row: WorkingRow = {};
    for (const field of CANONICAL_FIELDS) {
      const src = mapping[field.key];
      row[field.key] = src ? (raw[src] ?? '').trim() : '';
    }
    if (!row.composition) {
      const salts = readRawSalts(raw);
      if (salts.length) row.composition = saltsToshorthand(salts);
    }
    return row;
  });
}

export type IssueSeverity = 'error' | 'warning';

export interface RowIssue {
  row: number; // 0-based working-row index
  field: string; // canonical field key
  severity: IssueSeverity;
  message: string; // plain English, no row number (UI appends "in Row N")
}

const isBlank = (v: string | undefined) => !v || !v.trim();

/**
 * Validate working rows and return plain-English issues. Errors mean the row
 * can't be imported as-is; warnings are advisory (it will still import).
 */
export function validateRows(rows: WorkingRow[]): RowIssue[] {
  const issues: RowIssue[] = [];
  rows.forEach((row, i) => {
    const add = (field: string, severity: IssueSeverity, message: string) =>
      issues.push({ row: i, field, severity, message });

    if (isBlank(row.sku)) add('sku', 'error', 'SKU is missing');
    if (isBlank(row.name)) add('name', 'error', 'Product name is missing');
    if (isBlank(row.manufacturer)) add('manufacturer', 'error', 'Manufacturer is missing');
    if (isBlank(row.category)) add('category', 'error', 'Category is missing');

    if (isBlank(row.form)) {
      add('form', 'error', 'Dosage form is missing (e.g. tablet, capsule, syrup)');
    } else if (!normalizeAndValidateForm(row.form).ok) {
      add('form', 'error', `"${row.form}" is not a known dosage form (use tablet, capsule, syrup, injection…)`);
    }

    const price = Number(row.price);
    if (isBlank(row.price)) add('price', 'error', 'Selling price is missing');
    else if (!Number.isFinite(price) || price < 0) add('price', 'error', `Selling price "${row.price}" is not a valid amount`);

    const packSize = Number(row.pack_size);
    if (isBlank(row.pack_size)) add('pack_size', 'error', 'Pack size is missing');
    else if (!Number.isFinite(packSize) || packSize < 1) add('pack_size', 'error', `Pack size "${row.pack_size}" must be a whole number of 1 or more`);

    if (!isBlank(row.mrp)) {
      const mrp = Number(row.mrp);
      if (!Number.isFinite(mrp) || mrp < 0) add('mrp', 'error', `MRP "${row.mrp}" is not a valid amount`);
      else if (Number.isFinite(price) && mrp > 0 && mrp < price) add('mrp', 'warning', 'MRP is lower than the selling price, so no discount will show');
    }

    if (!isBlank(row.composition)) {
      const parsed = parseCompositionShorthand(row.composition);
      if (!parsed.ok) add('composition', 'error', parsed.error ?? 'Composition could not be read (e.g. "Paracetamol 650mg")');
    } else {
      add('composition', 'warning', 'No composition — this product will be saved but stays hidden until one is added');
    }

    if (!isBlank(row.gst_rate)) {
      const gst = Number(row.gst_rate);
      if (!Number.isFinite(gst) || !GST_SLABS.includes(gst)) add('gst_rate', 'warning', 'GST rate is not a standard slab — it will default to 5%');
    }
  });
  return issues;
}

/** Row indexes that have at least one error-severity issue. */
export function rowsWithErrors(issues: RowIssue[]): Set<number> {
  return new Set(issues.filter((i) => i.severity === 'error').map((i) => i.row));
}

/** Expand one working row into a canonical CSV record (composition → salt_*). */
function toCanonicalRecord(row: WorkingRow): Record<string, string> {
  const rec: Record<string, string> = {
    sku: row.sku ?? '',
    name: row.name ?? '',
    manufacturer: row.manufacturer ?? '',
    category: row.category ?? '',
    form: (row.form ?? '').trim().toLowerCase(),
    price: row.price ?? '',
    pack_size: row.pack_size ?? '',
    pack_unit: row.pack_unit ?? '',
    mrp: row.mrp ?? '',
    stock: row.stock ?? '',
    brand: row.brand ?? '',
    schedule_class: row.schedule_class ?? '',
    prescription_required: row.prescription_required ?? '',
    hsn_code: row.hsn_code ?? '',
    gst_rate: row.gst_rate ?? '',
    short_description: row.short_description ?? '',
    tags: row.tags ?? '',
    is_active: row.is_active ?? '',
    image_url_1: row.image_url_1 ?? '',
  };

  const parsed = parseCompositionShorthand(row.composition ?? '');
  const salts = parsed.ok ? parsed.salts ?? [] : [];
  salts.slice(0, 3).forEach((s, idx) => {
    rec[`salt_${idx + 1}_name`] = s.name;
    rec[`salt_${idx + 1}_strength`] = String(s.strength);
    rec[`salt_${idx + 1}_unit`] = s.unit;
  });

  return rec;
}

/** Serialize working rows into the canonical CSV the import route parses. */
export function workingRowsToCsv(rows: WorkingRow[]): string {
  return toCsv(rows.map(toCanonicalRecord), CANONICAL_CSV_HEADERS);
}

/** A friendly sample CSV (headers + two example rows) for the download link. */
export function sampleCsv(): string {
  const example: Record<string, string> = {
    sku: 'PMS-1001', name: 'Dolo 650', manufacturer: 'Micro Labs', category: 'General & OTC',
    form: 'tablet', price: '30.50', pack_size: '15', pack_unit: 'tablet', mrp: '36',
    stock: '120', brand: 'Dolo', schedule_class: 'OTC', prescription_required: 'no',
    hsn_code: '3004', gst_rate: '12', short_description: 'Paracetamol 650mg tablet',
    tags: '', is_active: 'yes', image_url_1: '',
    salt_1_name: 'Paracetamol', salt_1_strength: '650', salt_1_unit: 'mg',
  };
  const example2: Record<string, string> = {
    sku: 'PMS-1002', name: 'Augmentin 625 Duo', manufacturer: 'GSK', category: 'General & OTC',
    form: 'tablet', price: '182', pack_size: '10', pack_unit: 'tablet', mrp: '210',
    stock: '40', brand: 'Augmentin', schedule_class: 'H', prescription_required: 'yes',
    hsn_code: '3004', gst_rate: '12', short_description: 'Amoxicillin + Clavulanic acid',
    tags: '', is_active: 'yes', image_url_1: '',
    salt_1_name: 'Amoxicillin', salt_1_strength: '500', salt_1_unit: 'mg',
    salt_2_name: 'Clavulanic Acid', salt_2_strength: '125', salt_2_unit: 'mg',
  };
  return toCsv([example, example2], CANONICAL_CSV_HEADERS);
}

/** Build a failed-rows error report CSV from the server's error list. */
export function errorReportCsv(
  errors: { sku?: string; reason: string }[],
): string {
  const rows = errors.map((e) => ({ sku: e.sku ?? '', problem: e.reason }));
  return toCsv(rows, ['sku', 'problem']);
}
