import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  signRefreshToken,
  signTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
} from './token';

beforeEach(() => {
  process.env.MOBILE_JWT_SECRET = 'test-mobile-secret';
});

describe('access tokens', () => {
  it('round-trips subject, role and tokenVersion', () => {
    const token = signAccessToken('user1', 'staff', 3);
    const claims = verifyAccessToken(token);
    expect(claims).toMatchObject({ sub: 'user1', role: 'staff', type: 'access', tokenVersion: 3 });
  });

  it('rejects a refresh token passed where an access token is expected', () => {
    const refresh = signRefreshToken('user1', 'client');
    expect(verifyAccessToken(refresh)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = signAccessToken('user1', 'client');
    process.env.MOBILE_JWT_SECRET = 'a-different-secret';
    expect(verifyAccessToken(token)).toBeNull();
  });

  it('rejects a garbage token', () => {
    expect(verifyAccessToken('not.a.jwt')).toBeNull();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ role: 'client', type: 'access', tokenVersion: 0 }, 'test-mobile-secret', {
      subject: 'user1',
      expiresIn: -10,
    });
    expect(verifyAccessToken(expired)).toBeNull();
  });
});

describe('refresh tokens', () => {
  it('verifies only as a refresh token, not an access token', () => {
    const refresh = signRefreshToken('user1', 'admin', 5);
    expect(verifyRefreshToken(refresh)).toMatchObject({ sub: 'user1', type: 'refresh', tokenVersion: 5 });
    expect(verifyAccessToken(refresh)).toBeNull();
  });
});

describe('signTokenPair', () => {
  it('mints a matching access + refresh pair', () => {
    const { accessToken, refreshToken } = signTokenPair('user9', 'client', 1);
    expect(verifyAccessToken(accessToken)?.sub).toBe('user9');
    expect(verifyRefreshToken(refreshToken)?.tokenVersion).toBe(1);
  });
});
