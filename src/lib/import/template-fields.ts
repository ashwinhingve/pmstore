/**
 * Single source of truth for the simplified bulk-import "template" feature —
 * the fixed set of mandatory columns every template requires, and the pool of
 * optional columns an admin can choose to include. Both the ImportTemplate
 * model/validation, the template CSV builder, and the import/export routes
 * read from this file so the field list never drifts between them.
 *
 * `columns` map a field group to one or more of the CSV headers already used
 * by `ProductImportClient.tsx` / `parseProductRow` — a template narrows or
 * widens which of those columns are present/required, it never invents new
 * ones.
 */
export interface TemplateFieldGroup {
  key: string;
  label: string;
  columns: string[];
}

/** Always required by a template — matches the client's own example list
 * (Manufacturer*, Salt/Formula*, Product Name*, Product Image*) plus the
 * remaining fields a product cannot exist without. */
export const MANDATORY_FIELD_GROUPS: TemplateFieldGroup[] = [
  { key: 'sku', label: 'SKU', columns: ['sku'] },
  { key: 'name', label: 'Product name', columns: ['name'] },
  { key: 'manufacturer', label: 'Manufacturer', columns: ['manufacturer'] },
  { key: 'category', label: 'Category', columns: ['category'] },
  { key: 'salt', label: 'Salt / formula', columns: ['salt_1_name', 'salt_1_strength', 'salt_1_unit'] },
  { key: 'form', label: 'Dosage form', columns: ['form'] },
  { key: 'price', label: 'Price', columns: ['price'] },
  { key: 'pack', label: 'Pack size & unit', columns: ['pack_size', 'pack_unit'] },
  { key: 'image', label: 'Product image', columns: ['image_url_1'] },
];

/** Toggle-able per template — everything else the importer already accepts. */
export const OPTIONAL_FIELD_GROUPS: TemplateFieldGroup[] = [
  { key: 'brand', label: 'Brand', columns: ['brand'] },
  { key: 'mrp', label: 'MRP', columns: ['mrp'] },
  { key: 'gst_rate', label: 'GST rate', columns: ['gst_rate'] },
  { key: 'stock', label: 'Stock', columns: ['stock'] },
  { key: 'schedule_class', label: 'Schedule class', columns: ['schedule_class'] },
  { key: 'prescription_required', label: 'Prescription required', columns: ['prescription_required'] },
  { key: 'hsn_code', label: 'HSN code', columns: ['hsn_code'] },
  { key: 'short_description', label: 'Short description', columns: ['short_description'] },
  { key: 'storage_instructions', label: 'Storage instructions', columns: ['storage_instructions'] },
  { key: 'usage_instructions', label: 'Usage instructions', columns: ['usage_instructions'] },
  { key: 'side_effects', label: 'Side effects', columns: ['side_effects'] },
  { key: 'contraindications', label: 'Contraindications', columns: ['contraindications'] },
  { key: 'second_salt', label: 'Second salt / formula', columns: ['salt_2_name', 'salt_2_strength', 'salt_2_unit'] },
  { key: 'second_image', label: 'Second product image', columns: ['image_url_2'] },
  { key: 'tags', label: 'Tags', columns: ['tags'] },
  { key: 'is_active', label: 'Active', columns: ['is_active'] },
];

export const OPTIONAL_FIELD_KEYS: string[] = OPTIONAL_FIELD_GROUPS.map((g) => g.key);

export function isKnownOptionalField(key: string): boolean {
  return OPTIONAL_FIELD_KEYS.includes(key);
}

/** Mandatory + the chosen optional groups, in a stable display/column order. */
export function resolveTemplateFieldGroups(includedOptionalFields: string[]): TemplateFieldGroup[] {
  const chosen = new Set(includedOptionalFields);
  return [
    ...MANDATORY_FIELD_GROUPS,
    ...OPTIONAL_FIELD_GROUPS.filter((g) => chosen.has(g.key)),
  ];
}

/** Flat CSV column list (header order) for a template's field-group set. */
export function resolveTemplateColumns(includedOptionalFields: string[]): string[] {
  return resolveTemplateFieldGroups(includedOptionalFields).flatMap((g) => g.columns);
}
