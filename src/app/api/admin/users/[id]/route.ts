import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import User from '@/models/User';
import { z } from 'zod';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/users/[id]
 * Fetch a single user by ID
 * Admin only
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Verify admin access
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { id } = await params;

    await connectDB();

    const user = await User.findById(id)
      .select('email fullName name phoneNumber role emailVerified mobileVerified createdAt')
      .lean<{ _id: unknown } | null>();

    if (!user) {
      throw Errors.notFound('User', id);
    }

    // Serialize _id to string
    return NextResponse.json({
      data: {
        ...user,
        _id: String(user._id),
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Validation schema for role change
const updateUserSchema = z.object({
  role: z.enum(['client', 'staff', 'admin']),
});

/**
 * PATCH /api/admin/users/[id]
 * Update a user's role
 * Admin only
 *
 * Body:
 * - role: 'client' | 'staff' | 'admin'
 *
 * Safety: An admin cannot demote themselves
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Verify admin access and capture session
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;
  const session = adminCheck.session;

  try {
    const { id } = await params;

    // Parse and validate body
    const body = await req.json().catch(() => ({}));
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      throw Errors.validationError('Invalid role', parsed.error.flatten());
    }

    const { role } = parsed.data;

    // Safety check: prevent self-demotion
    // An admin must not demote themselves (would lock them out)
    if (id === session.user.id && role !== 'admin') {
      throw Errors.validationError('You cannot change your own admin role');
    }

    await connectDB();

    // Update user and get fresh data
    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true }
    )
      .select('email name role')
      .lean<{ _id: unknown } | null>();

    if (!updated) {
      throw Errors.notFound('User', id);
    }

    return NextResponse.json({
      data: {
        ...updated,
        _id: String(updated._id),
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
