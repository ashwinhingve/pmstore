import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

/**
 * POST /api/v1/auth/logout
 *
 * Logout-all-devices: bumps the user's mobileTokenVersion so every refresh
 * token issued so far stops working (the refresh route compares versions).
 * Access tokens already out there still work until they expire (≤15m) — an
 * acceptable window for a bearer scheme without a server-side token store.
 */
export async function POST(req: NextRequest) {
  const auth = authenticateMobile(req);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    await User.updateOne({ _id: auth.claims!.sub }, { $inc: { mobileTokenVersion: 1 } });
    return v1Ok({ loggedOut: true });
  } catch {
    return v1Error('Could not log out. Please try again.', 500, 'LOGOUT_FAILED');
  }
}
