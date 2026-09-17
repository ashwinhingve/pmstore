/**
 * Pure CSV-row → opening-stock parser for `scripts/import-opening-stock.ts`.
 *
 * Maps one raw row to a validated opening-stock entry or a reject reason — no
 * database, no side effects — so every rule is unit-testable. The script resolves
 * the `sku` to a Product and applies each row as an `opening` stock-in adjustment
 * (which seeds a StockBatch and raises Product.stock).
 *
 * Expiry accepts month+year (YYYY-MM, how packs print it) or a full date
 * (YYYY-MM-DD); month-only normalises to the 1st.
 */
export interface ParsedOpeningStockRow {
  sku: string;
  batchNumber: string;
  expiryDate?: string; // normalised YYYY-MM-DD
  quantity: number;
  costPrice: number;
  mrp?: number;
}

export type OpeningStockParseResult =
  | { ok: true; value: ParsedOpeningStockRow }
  | { ok: false; sku?: string; reason: string };

const clean = (v: string | undefined): string => (v ?? '').trim();

/** Normalise "2027-05" or "2027-05-01" to "2027-05-01"; null if malformed. */
export function normalizeExpiry(raw: string): string | null {
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

export function parseOpeningStockRow(row: Record<string, string>): OpeningStockParseResult {
  const sku = clean(row.sku).toUpperCase();
  if (!sku) return { ok: false, reason: 'Missing sku' };

  const batchNumber = clean(row.batchNumber);
  if (!batchNumber) return { ok: false, sku, reason: 'Missing batchNumber' };

  const quantity = Number(clean(row.quantity));
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, sku, reason: 'quantity must be a whole number of 1 or more' };
  }

  const costPrice = Number(clean(row.costPrice));
  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return { ok: false, sku, reason: 'costPrice must be 0 or more' };
  }

  const mrpRaw = clean(row.mrp);
  let mrp: number | undefined;
  if (mrpRaw) {
    mrp = Number(mrpRaw);
    if (!Number.isFinite(mrp) || mrp < 0) return { ok: false, sku, reason: 'mrp must be 0 or more' };
  }

  const expiryRaw = clean(row.expiryDate);
  let expiryDate: string | undefined;
  if (expiryRaw) {
    const normalized = normalizeExpiry(expiryRaw);
    if (!normalized) return { ok: false, sku, reason: 'expiryDate must be YYYY-MM or YYYY-MM-DD' };
    expiryDate = normalized;
  }

  return { ok: true, value: { sku, batchNumber, expiryDate, quantity, costPrice, mrp } };
}
