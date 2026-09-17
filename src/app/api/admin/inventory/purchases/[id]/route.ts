import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Purchase from '@/models/Purchase';
import Supplier from '@/models/Supplier';
import { purchaseSchema } from '@/lib/validations/purchase';
import { computePurchase } from '@/lib/inventory/purchase-math';
import { receivePurchase } from '@/lib/inventory/stock-mutations';
import { handleInventoryError } from '@/lib/inventory/api-error';
import { AppError, Errors, ErrorCodes } from '@/lib/utils/errorHandler';

/** GET /api/admin/inventory/purchases/[id] — full purchase with items. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  const { id } = await params;
  try {
    await connectDB();
    const purchase = await Purchase.findById(id).lean();
    if (!purchase) throw Errors.notFound('Purchase', id);
    return NextResponse.json({ data: purchase });
  } catch (err) {
    return handleInventoryError(err);
  }
}

const paySchema = z.object({
  paymentStatus: z.enum(['unpaid', 'partial', 'paid']).optional(),
  amountPaid: z.number().min(0).optional(),
});

/**
 * PUT /api/admin/inventory/purchases/[id]
 * Body may carry an `action`:
 *   - receive: turn each line into stock (once — a received purchase is locked)
 *   - cancel : cancel a not-yet-received purchase
 *   - pay    : update payment status / amount paid
 * With no action it edits a draft/ordered purchase (recomputing totals).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  const { id } = await params;
  const userId = adminCheck.session?.user?.id;

  try {
    const body = await req.json();
    await connectDB();

    const purchase = await Purchase.findById(id);
    if (!purchase) throw Errors.notFound('Purchase', id);

    const action = body?.action as string | undefined;

    if (action === 'receive') {
      if (purchase.status === 'received') {
        throw new AppError(409, 'This purchase has already been received', ErrorCodes.RESOURCE_CONFLICT);
      }
      if (purchase.status === 'cancelled') {
        throw new AppError(409, 'A cancelled purchase cannot be received', ErrorCodes.RESOURCE_CONFLICT);
      }
      purchase.receivedAt = new Date();
      await receivePurchase(purchase, { userId });
      purchase.status = 'received';
      await purchase.save();
      return NextResponse.json({ data: purchase });
    }

    if (action === 'cancel') {
      if (purchase.status === 'received') {
        throw new AppError(409, 'A received purchase cannot be cancelled — record a purchase return instead', ErrorCodes.RESOURCE_CONFLICT);
      }
      purchase.status = 'cancelled';
      await purchase.save();
      return NextResponse.json({ data: purchase });
    }

    if (action === 'pay') {
      const pay = paySchema.parse(body);
      if (pay.paymentStatus) purchase.paymentStatus = pay.paymentStatus;
      if (pay.amountPaid != null) purchase.amountPaid = Math.round(pay.amountPaid * 100) / 100;
      await purchase.save();
      return NextResponse.json({ data: purchase });
    }

    // Default: edit a draft/ordered purchase.
    if (purchase.status === 'received' || purchase.status === 'cancelled') {
      throw new AppError(409, 'Only a draft or ordered purchase can be edited', ErrorCodes.RESOURCE_CONFLICT);
    }
    const validated = purchaseSchema.parse(body);
    const supplier = await Supplier.findById(validated.supplierId).select('name').lean<{ name?: string } | null>();
    if (!supplier) throw Errors.notFound('Supplier', validated.supplierId);

    const { items, subtotal, taxAmount, total } = computePurchase(validated.items);
    purchase.set({
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
    });
    await purchase.save();
    return NextResponse.json({ data: purchase });
  } catch (err) {
    return handleInventoryError(err);
  }
}

/**
 * DELETE /api/admin/inventory/purchases/[id]
 * Only a purchase that never became stock (draft/ordered/cancelled) can be
 * deleted; a received purchase is reversed with a purchase return.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  const { id } = await params;
  try {
    await connectDB();
    const purchase = await Purchase.findById(id).select('status');
    if (!purchase) throw Errors.notFound('Purchase', id);
    if (purchase.status === 'received') {
      throw new AppError(409, 'A received purchase cannot be deleted — record a purchase return instead', ErrorCodes.RESOURCE_CONFLICT);
    }
    await purchase.deleteOne();
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (err) {
    return handleInventoryError(err);
  }
}
