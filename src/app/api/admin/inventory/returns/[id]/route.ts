import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import PurchaseReturn from '@/models/PurchaseReturn';
import { handleInventoryError } from '@/lib/inventory/api-error';
import { Errors } from '@/lib/utils/errorHandler';

/** GET /api/admin/inventory/returns/[id] — full return with items. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  const { id } = await params;
  try {
    await connectDB();
    const ret = await PurchaseReturn.findById(id).lean();
    if (!ret) throw Errors.notFound('Purchase return', id);
    return NextResponse.json({ data: ret });
  } catch (err) {
    return handleInventoryError(err);
  }
}
