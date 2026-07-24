import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Prescription from '@/models/Prescription';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * PATCH /api/admin/prescriptions/[id]/verify
 * Verify a prescription (set status to 'verified').
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

    await connectDB();

    const updated = await Prescription.findByIdAndUpdate(
      id,
      {
        status: 'verified',
        verifiedBy: session.user.id,
        verifiedAt: new Date(),
        $unset: { rejectionReason: '' },
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
