import { createHmac, timingSafeEqual } from 'crypto';

/**
 * One-click unsubscribe tokens for refill-reminder emails.
 *
 * A refill email can't require login to unsubscribe — the link has to work from
 * the inbox. So we sign the userId with an HMAC keyed on the app secret: the
 * link carries `u=<userId>&t=<token>`, and the route verifies the token before
 * flipping `refillOptOut`. No DB token table, no login, and a forged userId
 * can't be unsubscribed because the attacker can't produce a valid signature.
 *
 * Scoped with a purpose string so a token minted here can't be replayed against
 * some other HMAC-signed feature that happens to share the secret.
 */
const PURPOSE = 'refill-unsubscribe';

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('NEXTAUTH_SECRET is required to sign unsubscribe links');
  return s;
}

export function signUnsubscribeToken(userId: string): string {
  return createHmac('sha256', secret())
    .update(`${PURPOSE}:${userId}`)
    .digest('hex');
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  if (!userId || !token) return false;
  const expected = signUnsubscribeToken(userId);
  // Length guard before timingSafeEqual, which throws on unequal buffer sizes.
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/** Full unsubscribe URL for an email body. */
export function unsubscribeUrl(userId: string, baseUrl: string): string {
  const token = signUnsubscribeToken(userId);
  return `${baseUrl}/api/account/refill/unsubscribe?u=${encodeURIComponent(userId)}&t=${token}`;
}
