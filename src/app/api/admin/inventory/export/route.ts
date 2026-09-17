import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import StockBatch from '@/models/StockBatch';
import InventoryHistory from '@/models/InventoryHistory';
import Purchase from '@/models/Purchase';
import { lowStockMatch } from '@/lib/inventory/valuation';
import { EXPIRY_SOON_DAYS } from '@/lib/pharma/expiry';
import { handleInventoryError } from '@/lib/inventory/api-error';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  opening: 'Opening', purchase: 'Purchase', sale: 'Sale', adjustment: 'Adjustment', purchase_return: 'Purchase return',
};

/**
 * GET /api/admin/inventory/export?type=stock|history|purchases
 * Streams a CSV of the requested inventory data (honouring the same filters as
 * the matching list view) for accounting and stock-take. Admin only.
 */

const EXPORT_CAP = 10_000;

function esc(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}
const ymd = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'stock';

    let filename = 'inventory.csv';
    let csv = '';

    if (type === 'stock') {
      const search = searchParams.get('search');
      const filter = searchParams.get('filter');
      const query: Record<string, unknown> = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } },
        ];
      }
      if (filter === 'low') Object.assign(query, lowStockMatch);
      else if (filter === 'out') query.stock = 0;
      else if (filter === 'expiring' || filter === 'expired') {
        const now = new Date();
        const soon = new Date(now.getTime() + EXPIRY_SOON_DAYS * 86_400_000);
        const ids = await StockBatch.distinct('productId', {
          quantityRemaining: { $gt: 0 },
          expiryDate: filter === 'expired' ? { $lt: now } : { $gte: now, $lte: soon },
        });
        query._id = { $in: ids };
      }
      const products = await Product.find(query)
        .select('sku name manufacturer stock reorderLevel rackLocation expiryDate mrp price')
        .sort({ name: 1 })
        .limit(EXPORT_CAP)
        .lean();
      csv = toCsv(
        ['sku', 'name', 'manufacturer', 'stock', 'reorderLevel', 'rackLocation', 'expiryDate', 'mrp', 'price'],
        products.map((p) => [p.sku, p.name, p.manufacturer, p.stock, p.reorderLevel ?? '', p.rackLocation ?? '', ymd(p.expiryDate), p.mrp ?? '', p.price])
      );
      filename = 'stock.csv';
    } else if (type === 'history') {
      const query: Record<string, unknown> = {};
      const productId = searchParams.get('productId');
      const movementType = searchParams.get('movementType');
      if (productId && /^[a-f\d]{24}$/i.test(productId)) query.productId = productId;
      if (movementType) query.type = movementType;
      const rows = await InventoryHistory.find(query).sort({ createdAt: -1 }).limit(EXPORT_CAP).lean();
      csv = toCsv(
        ['date', 'product', 'batch', 'type', 'change', 'balanceAfter', 'reason', 'reference'],
        rows.map((r) => [
          new Date(r.createdAt).toISOString(),
          r.productName ?? '',
          r.batchNumber ?? '',
          MOVEMENT_TYPE_LABELS[r.type] ?? r.type,
          r.quantityDelta,
          r.balanceAfter ?? '',
          r.reason ?? '',
          r.refLabel ?? '',
        ])
      );
      filename = 'stock-history.csv';
    } else if (type === 'purchases') {
      const query: Record<string, unknown> = {};
      const status = searchParams.get('status');
      const supplierId = searchParams.get('supplierId');
      if (status) query.status = status;
      if (supplierId && /^[a-f\d]{24}$/i.test(supplierId)) query.supplierId = supplierId;
      const rows = await Purchase.find(query).sort({ createdAt: -1 }).limit(EXPORT_CAP).lean();
      csv = toCsv(
        ['purchaseNumber', 'supplier', 'invoiceNumber', 'status', 'paymentStatus', 'subtotal', 'taxAmount', 'total', 'amountPaid', 'created', 'received'],
        rows.map((p) => [
          p.purchaseNumber, p.supplierName, p.invoiceNumber ?? '', p.status, p.paymentStatus,
          p.subtotal, p.taxAmount, p.total, p.amountPaid, ymd(p.createdAt), ymd(p.receivedAt),
        ])
      );
      filename = 'purchases.csv';
    } else {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Unknown export type' } }, { status: 400 });
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleInventoryError(err);
  }
}
