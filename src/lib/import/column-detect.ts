/**
 * Auto-match the columns of an uploaded spreadsheet to the product fields the
 * importer understands.
 *
 * Non-technical admins export from all sorts of billing software, so headers
 * vary wildly ("MRP", "Max Retail Price", "Selling Price", "Rate", "Qty"…).
 * This maps each product field to the best-matching source header using a
 * normalized synonym table, then prefix/contains, then a one-edit typo match.
 * Pure and DB-free so it is unit-testable; the wizard shows the result with
 * manual-override dropdowns on top.
 */

export interface CanonicalField {
  /** Canonical CSV column the importer reads, or the special 'composition'. */
  key: string;
  /** Plain-English label shown in the mapping UI. */
  label: string;
  required: boolean;
  /** Normalized header synonyms (lowercase, alphanumeric only). */
  synonyms: string[];
  hint?: string;
}

/**
 * Fields offered in the wizard, in display order. `composition` is special: it
 * accepts a single "Paracetamol 650mg + …" column that is expanded into the
 * salt_* columns at serialize time (see wizard-row.ts).
 */
export const CANONICAL_FIELDS: CanonicalField[] = [
  { key: 'sku', label: 'SKU / item code', required: true, synonyms: ['sku', 'code', 'itemcode', 'productcode', 'barcode', 'articleno', 'itemno'], hint: 'Unique code for each product' },
  { key: 'name', label: 'Product name', required: true, synonyms: ['name', 'productname', 'product', 'medicine', 'medicinename', 'itemname', 'item', 'title', 'drug', 'drugname'] },
  { key: 'composition', label: 'Composition / salt', required: false, synonyms: ['composition', 'salt', 'salts', 'formula', 'contents', 'molecule', 'generic', 'genericname', 'activeingredient', 'ingredients', 'content'], hint: 'e.g. Paracetamol 650mg + Caffeine 50mg' },
  { key: 'manufacturer', label: 'Manufacturer / company', required: true, synonyms: ['manufacturer', 'company', 'mfr', 'mfg', 'maker', 'marketedby', 'mktby', 'companyname', 'brandcompany'] },
  { key: 'category', label: 'Category', required: true, synonyms: ['category', 'categoryname', 'segment', 'department', 'group'] },
  { key: 'form', label: 'Dosage form', required: true, synonyms: ['form', 'dosageform', 'dosage', 'presentation'], hint: 'tablet, capsule, syrup, injection…' },
  { key: 'price', label: 'Selling price', required: true, synonyms: ['price', 'sellingprice', 'sp', 'rate', 'salerate', 'saleprice', 'offerprice', 'ourprice', 'netprice', 'sellprice'] },
  { key: 'pack_size', label: 'Pack size', required: true, synonyms: ['packsize', 'pack', 'qty', 'quantity', 'units', 'numberoftablets', 'size', 'packqty', 'nos'], hint: 'e.g. 15 (tablets), 100 (ml)' },
  { key: 'pack_unit', label: 'Pack unit', required: false, synonyms: ['packunit', 'unit', 'uom', 'measure'], hint: 'tablet, ml, g, unit' },
  { key: 'mrp', label: 'MRP', required: false, synonyms: ['mrp', 'maxretailprice', 'maximumretailprice', 'printedprice', 'listprice'] },
  { key: 'stock', label: 'Stock', required: false, synonyms: ['stock', 'quantityinstock', 'inventory', 'available', 'availableqty', 'onhand', 'stockqty', 'qtyinstock', 'openingstock'] },
  { key: 'brand', label: 'Brand', required: false, synonyms: ['brand', 'brandname'] },
  { key: 'schedule_class', label: 'Schedule class', required: false, synonyms: ['schedule', 'scheduleclass', 'drugschedule', 'rxschedule'] },
  { key: 'prescription_required', label: 'Prescription required', required: false, synonyms: ['prescriptionrequired', 'prescription', 'rx', 'rxrequired', 'needsprescription'] },
  { key: 'hsn_code', label: 'HSN code', required: false, synonyms: ['hsn', 'hsncode', 'hsnsac'] },
  { key: 'gst_rate', label: 'GST rate', required: false, synonyms: ['gst', 'gstrate', 'tax', 'taxrate', 'gstpercent'] },
  { key: 'short_description', label: 'Description', required: false, synonyms: ['description', 'shortdescription', 'desc', 'details', 'about'] },
  { key: 'tags', label: 'Tags', required: false, synonyms: ['tags', 'labels', 'keywords'] },
  { key: 'image_url_1', label: 'Image URL', required: false, synonyms: ['image', 'imageurl', 'img', 'photo', 'picture', 'imagelink', 'imageurl1', 'image1'] },
  { key: 'is_active', label: 'Active', required: false, synonyms: ['active', 'isactive', 'status', 'enabled', 'published'] },
];

/** Lowercase + strip everything but a-z0-9 ("Max Retail Price" → "maxretailprice"). */
export function normalizeHeader(header: string): string {
  return (header ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Classic Levenshtein edit distance (small strings — fine to compute directly). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1, // deletion
        prev[j - 1] + 1, // insertion
        diag + (a[i - 1] === b[j - 1] ? 0 : 1), // substitution
      );
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Score how well a normalized header matches a field's synonyms (higher = better, 0 = no match). */
function scoreHeader(normHeader: string, synonyms: string[]): number {
  if (!normHeader) return 0;
  let best = 0;
  for (const syn of synonyms) {
    if (normHeader === syn) return 100; // exact — can't beat it
    if (normHeader.startsWith(syn) || syn.startsWith(normHeader)) best = Math.max(best, 70);
    else if (normHeader.includes(syn) || syn.includes(normHeader)) best = Math.max(best, 55);
    else if (syn.length >= 4 && levenshtein(normHeader, syn) <= 1) best = Math.max(best, 45);
  }
  return best;
}

/**
 * Detect a mapping from each canonical field to a source header. A header is
 * assigned to at most one field (the one it scores highest for), so two fields
 * never fight over the same column. Returns `{ field.key: header | null }`.
 */
export function detectColumns(headers: string[]): Record<string, string | null> {
  // Structured salt columns (salt_1_name, salt_2_strength…) are passed straight
  // through by the row builder, never mapped to a field — don't let "salt_1_name"
  // get matched to the composition field just because it contains "salt".
  const norm = headers
    .map((h) => ({ header: h, norm: normalizeHeader(h) }))
    .filter((h) => !/^salt\d/.test(h.norm));

  // Score every (field, header) pair, then greedily assign best matches first.
  const candidates: { field: string; header: string; score: number }[] = [];
  for (const field of CANONICAL_FIELDS) {
    for (const h of norm) {
      const score = scoreHeader(h.norm, field.synonyms);
      if (score > 0) candidates.push({ field: field.key, header: h.header, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const mapping: Record<string, string | null> = {};
  for (const f of CANONICAL_FIELDS) mapping[f.key] = null;
  const usedHeaders = new Set<string>();
  const filledFields = new Set<string>();

  for (const c of candidates) {
    if (filledFields.has(c.field) || usedHeaders.has(c.header)) continue;
    mapping[c.field] = c.header;
    filledFields.add(c.field);
    usedHeaders.add(c.header);
  }

  return mapping;
}
