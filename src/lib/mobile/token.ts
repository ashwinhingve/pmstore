/**
 * Mobile JWT access/refresh tokens.
 *
 * The web app uses NextAuth cookie sessions; the Expo app can't, so `/api/v1/*`
 * runs a separate bearer scheme (see src/app/api/CLAUDE.md). Two token types:
 *
 *   access  — short-lived (15m), sent on every request. Never stored server-side.
 *   refresh — long-lived (30d), used only to mint a fresh access token.
 *
 * Rotation/revocation: both tokens carry a `tokenVersion` copied from the user
 * record. Bumping the user's tokenVersion (on logout-all, password change, or a
 * lost device) invalidates every token ever issued to them — the refresh route
 * compares the claim against the current DB value. This module is pure crypto;
 * it neither reads nor writes the DB, so it's unit-testable without one.
 *
 * Signed with MOBILE_JWT_SECRET, kept distinct from NEXTAUTH_SECRET so the two
 * auth systems can't be confused for one another.
 */
import jwt, { type SignOptions } from 'jsonwebtoken';

// Typed as SignOptions['expiresIn'] — @types/jsonwebtoken brands the string form
// (e.g. '15m') as a template-literal type, so a plain `string` won't assign.
const ACCESS_TTL: SignOptions['expiresIn'] = '15m';
const REFRESH_TTL: SignOptions['expiresIn'] = '30d';

export type MobileTokenType = 'access' | 'refresh';

export interface MobileTokenClaims {
  /** User id (JWT `sub`). */
  sub: string;
  role: string;
  type: MobileTokenType;
  tokenVersion: number;
}

function secret(): string {
  const s = process.env.MOBILE_JWT_SECRET;
  if (!s) throw new Error('MOBILE_JWT_SECRET is required for mobile auth');
  return s;
}

function sign(
  type: MobileTokenType,
  userId: string,
  role: string,
  tokenVersion: number,
  ttl: SignOptions['expiresIn']
): string {
  return jwt.sign({ role, type, tokenVersion }, secret(), { subject: userId, expiresIn: ttl });
}

export function signAccessToken(userId: string, role: string, tokenVersion = 0): string {
  return sign('access', userId, role, tokenVersion, ACCESS_TTL);
}

export function signRefreshToken(userId: string, role: string, tokenVersion = 0): string {
  return sign('refresh', userId, role, tokenVersion, REFRESH_TTL);
}

/** Both tokens for a fresh login. */
export function signTokenPair(userId: string, role: string, tokenVersion = 0): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: signAccessToken(userId, role, tokenVersion),
    refreshToken: signRefreshToken(userId, role, tokenVersion),
  };
}

function verify(token: string, expectedType: MobileTokenType): MobileTokenClaims | null {
  try {
    const decoded = jwt.verify(token, secret());
    if (typeof decoded === 'string' || !decoded.sub || decoded.type !== expectedType) return null;
    return {
      sub: String(decoded.sub),
      role: String(decoded.role ?? 'client'),
      type: expectedType,
      tokenVersion: Number(decoded.tokenVersion ?? 0),
    };
  } catch {
    // Expired, malformed, or wrong signature — all indistinguishable to the caller.
    return null;
  }
}

export function verifyAccessToken(token: string): MobileTokenClaims | null {
  return verify(token, 'access');
}

export function verifyRefreshToken(token: string): MobileTokenClaims | null {
  return verify(token, 'refresh');
}
