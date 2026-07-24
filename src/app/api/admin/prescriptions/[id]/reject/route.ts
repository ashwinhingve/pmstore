import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyStaffAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Prescription from '@/models/Prescription';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * PATCH /api/admin/prescriptions/[id]/reject
 * Reject a prescription (set status to 'rejected', require rejection reason).
 * Staff and admin only.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await verifyStaffAccess();
    if (check.error) return check.error;
    const session = check.session;

    const { id } = await params;

    const body = await req.json().catch(() => ({}));

    const schema = z.object({
      rejectionReason: z.string().min(3).max(500),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw Errors.validationError(
        'A rejection reason is required (3-500 characters)',
        parsed.error.flatten()
      );
    }

    const { rejectionReason } = parsed.data;

    await connectDB();

    const updated = await Prescription.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        rejectionReason,
        verifiedBy: session.user.id,
        verifiedAt: new Date(),
      },
      { new: true }
    ).lean<{
      _id: unknown;
      status: string;
    } | null>();

    if (!updated) {
      throw Errors.notFound('Prescription', id);
    }

    return NextResponse.json({
      data: {
        id: String(updated._id),
        status: updated.status,
      },
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}
