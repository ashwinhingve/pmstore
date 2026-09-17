import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import InventoryHistory from '@/models/InventoryHistory';
import { handleInventoryError } from '@/lib/inventory/api-error';

/**
 * GET /api/admin/inventory/history
 * The stock ledger — every movement, newest first. Filters: product, type,
 * from/to date.
 */
export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: Record<string, unknown> = {};
    if (productId && /^[a-f\d]{24}$/i.test(productId)) query.productId = productId;
    if (type && ['opening', 'purchase', 'sale', 'adjustment', 'purchase_return'].includes(type)) {
      query.type = type;
    }
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) range.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) range.$lte = new Date(`${to}T23:59:59.999Z`);
      if (Object.keys(range).length) query.createdAt = range;
    }

    const [history, total] = await Promise.all([
      InventoryHistory.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      InventoryHistory.countDocuments(query),
    ]);

    return NextResponse.json({
      data: history,
      pagination: {
        page, limit, total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    return handleInventoryError(err);
  }
}
