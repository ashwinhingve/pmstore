import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import { getInventoryOverview } from '@/lib/inventory/valuation';
import { handleInventoryError } from '@/lib/inventory/api-error';

/**
 * GET /api/admin/inventory/overview
 * Stock valuation + attention counts for the inventory dashboard.
 */
export async function GET() {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const overview = await getInventoryOverview();
    return NextResponse.json({ data: overview });
  } catch (err) {
    return handleInventoryError(err);
  }
}
