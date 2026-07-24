import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import User from '@/models/User';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * The customer's own profile. Read and lightly edit display name + phone.
 * Email and role are intentionally not editable here — email is the login
 * identity and role is admin-controlled.
 */
const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phoneNumber: z.string().trim().min(6).max(20).optional(),
});

export async function GET() {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw Errors.unauthorized();

    const user = await User.findById(session.user.id)
      .select('email fullName name phoneNumber role emailVerified mobileVerified createdAt')
      .lean<Record<string, unknown> | null>();
    if (!user) throw Errors.notFound('User');

    return NextResponse.json({
      data: {
        email: user.email ?? null,
        fullName: user.fullName ?? user.name ?? '',
        phoneNumber: user.phoneNumber ?? '',
        role: user.role,
        emailVerified: user.emailVerified ?? false,
        mobileVerified: user.mobileVerified ?? false,
      },
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw Errors.unauthorized();

    const parsed = profileSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw Errors.validationError('Check your details', parsed.error.flatten());

    const update: Record<string, string> = {};
    if (parsed.data.fullName !== undefined) update.fullName = parsed.data.fullName;
    if (parsed.data.phoneNumber !== undefined) update.phoneNumber = parsed.data.phoneNumber;

    if (Object.keys(update).length > 0) {
      await User.updateOne({ _id: session.user.id }, { $set: update });
    }

    return NextResponse.json({ data: update });
  } catch (err) {
    return createErrorResponse(err);
  }
}
