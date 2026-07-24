import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * POST /api/admin/products/bulk-stock
 * Bulk update product stock levels
 *
 * Stock changes do not affect derived fields (unitPrice, compositionKey),
 * so bulkWrite can be used without explicit recomputation.
 *
 * Admin only
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    // Connect to database
    await connectDB();

    // Validate request body
    const bodySchema = z.object({
      updates: z
        .array(
          z.object({
            id: z.string(),
            stock: z.number().int().min(0),
          })
        )
        .min(1)
        .max(500),
    });

    const body = bodySchema.parse(await req.json());
    const { updates } = body;

    // Build bulkWrite operations
    const ops = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id },
        update: {
          $set: {
            stock: update.stock,
          },
        },
      },
    }));

    // Execute bulk operation
    const result = await Product.bulkWrite(ops);

    // Invalidate product caches
    revalidatePath('/');
    revalidatePath('/products');

    return NextResponse.json(
      {
        data: {
          updated: result.modifiedCount ?? updates.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        Errors.validationError('Invalid request body', error.flatten()),
        400
      );
    }

    // Handle other errors
    return createErrorResponse(error);
  }
}
