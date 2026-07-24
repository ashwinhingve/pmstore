import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyRefreshToken, signTokenPair } from '@/lib/mobile/token';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

/**
 * POST /api/v1/auth/refresh  { refreshToken }
 *
 * Exchanges a valid refresh token for a fresh access+refresh pair (rotation:
 * the old refresh token is replaced, not reused). Revocation is enforced here —
 * if the user's mobileTokenVersion has moved past the token's claim (logout-all,
 * lost device), the refresh is rejected even though the signature is valid.
 */
export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json().catch(() => ({}));
    if (!refreshToken) return v1Error('Refresh token is required.', 400, 'NO_REFRESH_TOKEN');

    const claims = verifyRefreshToken(refreshToken);
    if (!claims) return v1Error('Invalid or expired refresh token.', 401, 'BAD_REFRESH_TOKEN');

    await connectDB();
    const user = await User.findById(claims.sub)
      .select('role mobileTokenVersion')
      .lean<{ role: string; mobileTokenVersion?: number } | null>();
    if (!user) return v1Error('Account not found.', 401, 'USER_NOT_FOUND');

    // The token was revoked if its version is behind the account's current one.
    if ((user.mobileTokenVersion ?? 0) !== claims.tokenVersion) {
      return v1Error('Session revoked. Please sign in again.', 401, 'TOKEN_REVOKED');
    }

    const pair = signTokenPair(claims.sub, user.role, user.mobileTokenVersion ?? 0);
    return v1Ok(pair);
  } catch {
    return v1Error('Could not refresh session.', 500, 'REFRESH_FAILED');
  }
}
