/**
 * Convert a BulkProductRow (from JSON API) directly to ParsedProductRow.
 * This is cleaner than converting to Record<string, string> and re-parsing,
 * since the JSON data is already structured and validated by Zod.
 *
 * CRITICAL: Enforces Schedule H/H1/X prescription rule (CLAUDE.md non-negotiable #3):
 * Schedule H/H1/X drugs are ALWAYS prescription-required, regardless of input.
 * This matches the CSV path's enforcement (product-row.ts line ~143).
 */

import type { BulkProductRow } from '@/lib/validations/bulk-product-import';
import type { ParsedProductRow } from '@/lib/import/product-row';
import { RX_SCHEDULES } from '@/lib/import/product-row';

export function bulkRowToParsedProductRow(row: BulkProductRow): ParsedProductRow {
  // Enforce prescription requirement for Schedule H/H1/X drugs
  // Never allow a data-entry slip to make an Rx medicine sellable without a prescription
  const prescriptionRequired = RX_SCHEDULES.includes(row.scheduleClass) || row.prescriptionRequired;

  return {
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    manufacturer: row.manufacturer,
    categoryName: row.category,
    salts: row.salts,
    form: row.form,
    packSize: row.packSize,
    packUnit: row.packUnit,
    price: row.price,
    mrp: row.mrp,
    gstRate: row.gstRate,
    stock: row.stock,
    prescriptionRequired,
    scheduleClass: row.scheduleClass,
    hsnCode: row.hsnCode,
    description: row.description,
    storageInstructions: row.storageInstructions,
    usageInstructions: row.usageInstructions,
    sideEffects: row.sideEffects,
    contraindications: row.contraindications,
    imageUrls: [], // Images are handled separately in JSON path (via the images map)
    tags: row.tags,
    isActive: row.isActive,
  };
}
