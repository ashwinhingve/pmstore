import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

const bodySchema = z.object({ token: z.string().min(10).max(4096) });

/**
 * POST /api/v1/push/register  { token }
 *
 * Registers an FCM device token for push (order updates, refill reminders).
 * Authenticated via bearer. $addToSet keeps it idempotent — re-registering the
 * same device doesn't create duplicates.
 */
export async function POST(req: NextRequest) {
  const auth = authenticateMobile(req);
  if (auth.error) return auth.error;

  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return v1Error('A valid push token is required.', 400, 'INVALID_TOKEN');

    await connectDB();
    await User.updateOne({ _id: auth.claims!.sub }, { $addToSet: { pushTokens: parsed.data.token } });
    return v1Ok({ registered: true });
  } catch {
    return v1Error('Could not register the device.', 500, 'REGISTER_FAILED');
  }
}
