/**
 * Shared CSV-building helpers for the bulk-import template feature. Kept
 * server-safe (no 'use client') so both the admin download route and the
 * client-side ProductImportClient can import the same example data and
 * escaping logic without duplicating it.
 */

/** The full column set — every mandatory + optional field. This is exactly
 * today's default "download template" output when no saved template is
 * selected, so that behaviour stays unchanged. */
export const TEMPLATE_HEADERS = [
  'sku', 'name', 'brand', 'manufacturer', 'category', 'form', 'pack_size', 'pack_unit',
  'salt_1_name', 'salt_1_strength', 'salt_1_unit',
  'salt_2_name', 'salt_2_strength', 'salt_2_unit',
  'price', 'mrp', 'gst_rate', 'stock', 'schedule_class', 'prescription_required', 'hsn_code',
  'short_description', 'storage_instructions', 'usage_instructions',
  'side_effects', 'contraindications', 'image_url_1', 'image_url_2', 'tags', 'is_active',
];

/** Columns the base importer (no template) already requires — unchanged. */
export const REQUIRED_COLUMNS = ['sku', 'name', 'manufacturer', 'category', 'form', 'price', 'pack_size'];

/** One example product (Dolo 650), keyed by CSV column — used to fill the
 * downloadable template's sample row so an admin sees a realistic shape. */
export const TEMPLATE_EXAMPLE: Record<string, string> = {
  sku: 'PMS-TAB-DOLO-650',
  name: 'Dolo 650',
  brand: 'Dolo',
  manufacturer: 'Micro Labs',
  category: 'Pain Relief',
  form: 'tablet',
  pack_size: '15',
  pack_unit: 'tablets',
  salt_1_name: 'Paracetamol',
  salt_1_strength: '650',
  salt_1_unit: 'mg',
  salt_2_name: '',
  salt_2_strength: '',
  salt_2_unit: '',
  price: '30.50',
  mrp: '36',
  gst_rate: '12',
  stock: '100',
  schedule_class: 'OTC',
  prescription_required: 'FALSE',
  hsn_code: '3004',
  short_description: 'Paracetamol 650 mg for fever and pain',
  storage_instructions: 'Store below 30 C',
  usage_instructions: 'As directed by the physician',
  side_effects: 'Nausea|Rash',
  contraindications: 'Severe liver disease',
  image_url_1: '',
  image_url_2: '',
  tags: '',
  is_active: 'TRUE',
};

export const csvCell = (v: string): string =>
  /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

/** Header row + one example row, restricted to the given columns in order. */
export function buildTemplateCsv(columns: string[], overrides: Record<string, string> = {}): string {
  const example = { ...TEMPLATE_EXAMPLE, ...overrides };
  const header = columns.map(csvCell).join(',');
  const row = columns.map((c) => csvCell(example[c] ?? '')).join(',');
  return `${header}\n${row}\n`;
}
