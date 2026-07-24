import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import User from '@/models/User';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

const preferencesSchema = z.object({
  refillOptOut: z.boolean(),
});

/** GET /api/account/preferences — the caller's notification preferences. */
export async function GET() {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw Errors.unauthorized();

    const user = await User.findById(session.user.id)
      .select('refillOptOut')
      .lean<{ refillOptOut?: boolean } | null>();
    if (!user) throw Errors.notFound('User');

    return NextResponse.json({ data: { refillOptOut: user.refillOptOut ?? false } });
  } catch (err) {
    return createErrorResponse(err);
  }
}

/** PATCH /api/account/preferences — update refill-reminder opt-out. */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw Errors.unauthorized();

    const parsed = preferencesSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw Errors.validationError('Invalid preferences', parsed.error.flatten());

    await User.updateOne(
      { _id: session.user.id },
      { $set: { refillOptOut: parsed.data.refillOptOut } }
    );

    return NextResponse.json({ data: { refillOptOut: parsed.data.refillOptOut } });
  } catch (err) {
    return createErrorResponse(err);
  }
}
