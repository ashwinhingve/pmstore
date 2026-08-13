import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';
import { enquiryStatusSchema } from '@/lib/validations/contact';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * PATCH /api/admin/enquiries/[id]
 * Move a contact enquiry through its status: new → read → replied → closed.
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
    const parsed = enquiryStatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw Errors.validationError('Choose a valid status', parsed.error.flatten());
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      id,
      { status: parsed.data.status },
      { new: true, runValidators: true }
    ).lean<{ _id: unknown; status: string } | null>();

    if (!enquiry) {
      throw Errors.notFound('Enquiry', id);
    }

    return NextResponse.json({
      data: { id: String(enquiry._id), status: enquiry.status },
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}
