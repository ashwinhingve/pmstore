import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import { computeUnitPrice } from '@/lib/pharma/composition';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * POST /api/admin/products/bulk-price
 * Bulk update product prices
 *
 * CRITICAL: When changing price, unitPrice MUST be recomputed explicitly.
 * This route uses bulkWrite with explicit unitPrice calculation because
 * bulkWrite skips Mongoose pre-validate hooks (which normally compute unitPrice).
 * We fetch each product's packSize first, then compute unitPrice for each price change.
 * This ensures the per-tablet/ml comparison that powers the pharmacy stays correct (CLAUDE.md rule #2).
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
            price: z.number().min(0),
          })
        )
        .min(1)
        .max(500),
    });

    const body = bodySchema.parse(await req.json());
    const { updates } = body;

    // Extract product IDs
    const productIds = updates.map((u) => u.id);

    // Fetch products to get their packSize (required for unitPrice computation)
    const products = await Product.find({ _id: { $in: productIds } })
      .select('_id packSize')
      .lean<Array<{ _id: unknown; packSize: number }>>();

    // Build a map of id -> packSize
    const packSizeMap = new Map<string, number>();
    products.forEach((p) => {
      packSizeMap.set(String(p._id), p.packSize);
    });

    // Build bulkWrite operations
    const ops: any[] = [];
    const skipped: string[] = [];

    for (const update of updates) {
      const packSize = packSizeMap.get(update.id);

      if (!packSize) {
        // Product not found, skip it
        skipped.push(update.id);
        continue;
      }

      // Compute unitPrice explicitly (this is why we use bulkWrite instead of updateMany)
      const unitPrice = computeUnitPrice(update.price, packSize);

      ops.push({
        updateOne: {
          filter: { _id: update.id },
          update: {
            $set: {
              price: update.price,
              unitPrice, // DERIVED value — computed explicitly here
            },
          },
        },
      });
    }

    // Execute bulk operation
    if (ops.length > 0) {
      await Product.bulkWrite(ops);
    }

    // Invalidate product caches
    revalidatePath('/');
    revalidatePath('/products');

    return NextResponse.json(
      {
        data: {
          updated: ops.length,
          skipped,
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
