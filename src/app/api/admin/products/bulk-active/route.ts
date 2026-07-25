import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import { bulkActiveSchema } from '@/lib/validations/admin-bulk';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * POST /api/admin/products/bulk-active
 * Bulk activate or deactivate products.
 *
 * `isActive` is not a derived field, so bulkWrite is safe here — no
 * unitPrice/compositionKey recomputation needed (unlike bulk-price).
 *
 * Admin only — verifyAdminAccess re-reads the role from the database
 * (CLAUDE.md rule #4).
 */
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();

    const { ids, isActive } = bulkActiveSchema.parse(await req.json());

    const result = await Product.bulkWrite(
      ids.map((id) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { isActive } },
        },
      }))
    );

    revalidatePath('/');
    revalidatePath('/products');

    return NextResponse.json(
      {
        data: {
          updated: result.modifiedCount ?? 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        Errors.validationError('Invalid request body', error.flatten()),
        400
      );
    }

    return createErrorResponse(error);
  }
}
