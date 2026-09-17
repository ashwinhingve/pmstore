import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Purchase from '@/models/Purchase';
import Supplier from '@/models/Supplier';
import { purchaseSchema } from '@/lib/validations/purchase';
import { computePurchase } from '@/lib/inventory/purchase-math';
import { nextRef } from '@/lib/inventory/numbering';
import { receivePurchase } from '@/lib/inventory/stock-mutations';
import { handleInventoryError } from '@/lib/inventory/api-error';
import { Errors } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/inventory/purchases
 * List purchases (paginated, filter by status/supplier, search number/invoice).
 */
export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};
    if (status && ['draft', 'ordered', 'received', 'cancelled'].includes(status)) query.status = status;
    if (supplierId && /^[a-f\d]{24}$/i.test(supplierId)) query.supplierId = supplierId;
    if (search) {
      query.$or = [
        { purchaseNumber: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
      ];
    }

    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .select('purchaseNumber supplierName invoiceNumber invoiceDate status paymentStatus total amountPaid items createdAt receivedAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(query),
    ]);

    // Trim items to a count for the list view (full items load on the detail page).
    const data = purchases.map((p) => ({
      ...p,
      itemCount: Array.isArray(p.items) ? p.items.length : 0,
      items: undefined,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    return handleInventoryError(err);
  }
}

/**
 * POST /api/admin/inventory/purchases
 * Create a purchase. Totals are recomputed server-side. If created directly as
 * `received`, stock is applied at once via receivePurchase().
 */
export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const validated = purchaseSchema.parse(await req.json());
    await connectDB();

    const supplier = await Supplier.findById(validated.supplierId).select('name').lean<{ name?: string } | null>();
    if (!supplier) throw Errors.notFound('Supplier', validated.supplierId);

    const { items, subtotal, taxAmount, total } = computePurchase(validated.items);
    const purchaseNumber = await nextRef('PUR');
    const isReceived = validated.status === 'received';

    const purchase = await Purchase.create({
      purchaseNumber,
      supplierId: validated.supplierId,
      supplierName: supplier.name,
      invoiceNumber: validated.invoiceNumber || undefined,
      invoiceDate: validated.invoiceDate ? new Date(validated.invoiceDate) : undefined,
      status: validated.status,
      items,
      subtotal,
      taxAmount,
      total,
      paymentStatus: validated.paymentStatus,
      amountPaid: validated.amountPaid,
      notes: validated.notes || undefined,
      attachments: validated.attachments,
      receivedAt: isReceived ? new Date() : undefined,
      createdBy: adminCheck.session?.user?.id,
    });

    if (isReceived) {
      await receivePurchase(purchase, { userId: adminCheck.session?.user?.id });
    }

    return NextResponse.json({ data: purchase }, { status: 201 });
  } catch (err) {
    return handleInventoryError(err);
  }
}
