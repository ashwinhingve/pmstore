import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import CustomOrder from '@/models/CustomOrder';
import { customOrderStatusSchema } from '@/lib/validations/custom-order';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * PATCH /api/admin/custom-orders/[id]
 * Move a custom-order request through its status: new → contacted → closed.
 * Admin only; the role is re-read from the database inside verifyAdminAccess so a
 * stale JWT can't mutate the queue (CLAUDE.md rule #4).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();

    const { id } = await params;
    const parsed = customOrderStatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw Errors.validationError('Choose a valid status', parsed.error.flatten());
    }

    const order = await CustomOrder.findByIdAndUpdate(
      id,
      { status: parsed.data.status },
      { new: true, runValidators: true }
    ).lean<{ _id: unknown; status: string } | null>();

    if (!order) {
      throw Errors.notFound('Custom order', id);
    }

    return NextResponse.json({
      data: { id: String(order._id), status: order.status },
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}
