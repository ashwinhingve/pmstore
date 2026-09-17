import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import mongoose from 'mongoose';
import Product from '../src/models/Product';
import StockBatch from '../src/models/StockBatch';
import InventoryAdjustment from '../src/models/InventoryAdjustment';
import { applyAdjustment } from '../src/lib/inventory/stock-mutations';
import { parseCsv } from '../src/lib/import/csv';
import { parseOpeningStockRow } from '../src/lib/import/opening-stock-row';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Opening-stock importer — seeds an existing pharmacy's current inventory as
 * batches so the system starts from reality instead of zero.
 *
 * All row rules live in the pure, unit-tested `parseOpeningStockRow`
 * (src/lib/import/opening-stock-row.ts). Each valid row is applied as an
 * `opening` stock-in adjustment through the inventory service, which seeds a
 * StockBatch, raises Product.stock, writes the ledger and refreshes expiry.
 *
 * Idempotent per (sku, batchNumber): a batch that already exists is skipped, so
 * re-running after fixing rejects never double-counts.
 *
 * Usage:
 *   npx tsx scripts/import-opening-stock.ts data/opening-stock.csv
 *
 * templates/opening-stock-template.csv is the contract.
 */

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Usage: npx tsx scripts/import-opening-stock.ts <file.csv>');
  }
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set. Check .env.local');

  const text = readFileSync(file, 'utf8');
  const rows = parseCsv(text);
  console.log(`Parsed ${rows.length} rows from ${file}.`);

  await mongoose.connect(mongoUri);

  let imported = 0;
  let skipped = 0;
  const rejects: { sku: string; reason: string }[] = [];

  for (const raw of rows) {
    const result = parseOpeningStockRow(raw);
    if (!result.ok) {
      rejects.push({ sku: result.sku ?? '(no sku)', reason: result.reason });
      continue;
    }
    const row = result.value;
    try {
      const product = await Product.findOne({ sku: row.sku }).select('name');
      if (!product) {
        rejects.push({ sku: row.sku, reason: 'No product with this sku' });
        continue;
      }

      // Idempotency — don't re-seed a batch we already imported.
      const existingBatch = await StockBatch.findOne({ productId: product._id, batchNumber: row.batchNumber }).select('_id');
      if (existingBatch) {
        skipped++;
        continue;
      }

      const adjustment = await InventoryAdjustment.create({
        productId: product._id,
        productName: product.name,
        direction: 'in',
        quantity: row.quantity,
        reason: 'opening',
        batchNumber: row.batchNumber,
        expiryDate: row.expiryDate ? new Date(row.expiryDate) : undefined,
        costPrice: row.costPrice,
        mrp: row.mrp,
        note: 'Opening stock import',
      });
      await applyAdjustment(adjustment);
      imported++;
    } catch (err) {
      rejects.push({ sku: row.sku, reason: (err as Error).message });
    }
  }

  if (rejects.length) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = join(__dirname, '..', 'data');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `opening-stock-rejects-${stamp}.csv`);
    const csv = ['sku,reason', ...rejects.map((r) => `${r.sku},"${r.reason.replace(/"/g, '""')}"`)].join('\n');
    writeFileSync(path, csv, 'utf8');
    console.log(`Rejected ${rejects.length} rows → ${path}`);
  }

  console.log(`Imported ${imported} batches, skipped ${skipped} already-present, ${rejects.length} rejected.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('import-opening-stock failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
