import type { NextRequest } from 'next/server';
import { verifyAccessToken, type MobileTokenClaims } from './token';
import { v1Error } from './response';

/** Pull the raw token out of an `Authorization: Bearer <token>` header. */
export function extractBearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Authenticate a `/api/v1/*` request from its bearer access token. Returns the
 * verified claims, or a ready-to-return 401 (already v1-shaped). Note this
 * validates the token's signature and type only — it does NOT check the
 * user's current tokenVersion; the refresh route owns revocation, and access
 * tokens are short-lived (15m) by design, so a per-request DB read isn't worth
 * it on every call.
 */
export function authenticateMobile(req: NextRequest): { claims?: MobileTokenClaims; error?: Response } {
  const token = extractBearer(req);
  if (!token) return { error: v1Error('Missing bearer token', 401, 'NO_TOKEN') };

  const claims = verifyAccessToken(token);
  if (!claims) return { error: v1Error('Invalid or expired token', 401, 'BAD_TOKEN') };

  return { claims };
}
