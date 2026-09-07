import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import { duplicateCheckSchema } from '@/lib/validations/duplicate-check';
import { findDuplicateProducts } from '@/lib/admin/duplicate-detection';
import { createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * POST /api/admin/products/check-duplicate
 * Advisory duplicate detection for the product form.
 *
 * Returns up to ~5 active products where:
 * - Always: normalized name matches (case-insensitive)
 * - When manufacturer + salts/form + packSize all present: also checks
 *   the exact-duplicate rule (manufacturer + compositionKey + packSize)
 *
 * Excludes currentProductId so editing a product doesn't warn against itself.
 *
 * Admin only (re-reads role from DB per CLAUDE.md rule 4).
 */
export async function POST(req: Request) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const body = duplicateCheckSchema.parse(await req.json());
    await connectDB();

    const matches = await findDuplicateProducts(
      body.name,
      body.salts,
      body.form,
      body.manufacturer,
      body.packSize,
      body.currentProductId,
      5
    );

    return NextResponse.json({ matches });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues ?? error.errors },
        { status: 400 }
      );
    }
    console.error('❌ Error checking duplicates:', error);
    return createErrorResponse(error);
  }
}
