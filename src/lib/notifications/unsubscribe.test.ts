import { describe, it, expect, beforeEach } from 'vitest';
import { signUnsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl } from './unsubscribe';

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = 'test-secret-for-unsubscribe';
});

describe('unsubscribe tokens', () => {
  it('verifies a token it signed', () => {
    const token = signUnsubscribeToken('user123');
    expect(verifyUnsubscribeToken('user123', token)).toBe(true);
  });

  it('rejects a token for a different user (no cross-user unsubscribe)', () => {
    const token = signUnsubscribeToken('user123');
    expect(verifyUnsubscribeToken('user456', token)).toBe(false);
  });

  it('rejects a tampered or empty token', () => {
    const token = signUnsubscribeToken('user123');
    // Flip the last hex digit to guarantee a different-but-same-length token.
    const flipped = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(verifyUnsubscribeToken('user123', flipped)).toBe(false);
    expect(verifyUnsubscribeToken('user123', '')).toBe(false);
    expect(verifyUnsubscribeToken('', token)).toBe(false);
  });

  it('changes the signature when the secret changes', () => {
    const a = signUnsubscribeToken('user123');
    process.env.NEXTAUTH_SECRET = 'a-different-secret';
    const b = signUnsubscribeToken('user123');
    expect(a).not.toBe(b);
  });

  it('builds a URL carrying the userId and a valid token', () => {
    const url = unsubscribeUrl('user123', 'https://example.com');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('u')).toBe('user123');
    expect(verifyUnsubscribeToken('user123', parsed.searchParams.get('t')!)).toBe(true);
  });
});
