import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Prescription from '@/models/Prescription';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/prescriptions
 * List pending prescriptions (queue), sorted oldest first.
 * Query params: status (default 'pending'), page (default 1), limit (default 20, max 50)
 * Staff and admin only.
 */
export async function GET(req: NextRequest) {
  try {
    const check = await verifyStaffAccess();
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);

    const status = (searchParams.get('status') || 'pending') as
      | 'pending'
      | 'verified'
      | 'rejected'
      | 'expired';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10)), 50);

    await connectDB();

    // Find prescriptions matching status, sorted oldest first (earliest createdAt)
    const [data, total] = await Promise.all([
      Prescription.find({ status })
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email')
        .lean<
          Array<{
            _id: unknown;
            userId: { _id: unknown; name?: string; email?: string } | null;
            orderId?: unknown;
            images: Array<{ url: string; publicId: string }>;
            status: string;
            patientName?: string;
            doctorName?: string;
            issueDate?: Date;
            buildCartRequested: boolean;
            verifiedBy?: unknown;
            verifiedAt?: Date;
            rejectionReason?: string;
            createdAt: Date;
            updatedAt: Date;
          }>
        >(),
      Prescription.countDocuments({ status }),
    ]);

    // Serialize ObjectIds to strings
    const serialized = data.map((doc) => ({
      ...doc,
      _id: String(doc._id),
      userId: doc.userId
        ? { ...doc.userId, _id: String(doc.userId._id) }
        : null,
      orderId: doc.orderId ? String(doc.orderId) : undefined,
      verifiedBy: doc.verifiedBy ? String(doc.verifiedBy) : undefined,
    }));

    return NextResponse.json({
      data: serialized,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}
