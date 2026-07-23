import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * RBAC test (c) for verifyAdminAccess (docs/PHASE-0-PATCHES.md §2,
 * CLAUDE.md non-negotiable rule #4).
 *
 * A stale or forged JWT can carry role: 'admin' even after the user was demoted
 * in the database. The session (and thus session.user.role) is derived from that
 * token, so a destructive admin handler must NOT trust it — it must re-read the
 * role from the database. These tests pin that behaviour.
 */

// next-auth's getServerSession is the token-derived session source.
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));

// Don't pull the real NextAuth config graph into the test.
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

// DB layer. Declared via vi.hoisted so the hoisted vi.mock factory below can
// safely reference these before the module-body order would otherwise allow.
const { leanMock, selectMock, findByIdMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  const selectMock = vi.fn(() => ({ lean: leanMock }));
  const findByIdMock = vi.fn(() => ({ select: selectMock }));
  return { leanMock, selectMock, findByIdMock };
});
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: findByIdMock } }));

import { getServerSession } from 'next-auth';
import { verifyAdminAccess } from '@/lib/auth-helpers';

const mockedGetServerSession = vi.mocked(getServerSession);

beforeEach(() => {
  mockedGetServerSession.mockReset();
  findByIdMock.mockClear();
  selectMock.mockClear();
  leanMock.mockReset();
});

describe('verifyAdminAccess re-reads the role from the database', () => {
  it('rejects a forged/stale token that claims admin when the DB says client', async () => {
    // Token claims admin...
    mockedGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } } as never);
    // ...but the database — the source of truth — says client.
    leanMock.mockResolvedValue({ role: 'client' });

    const result = await verifyAdminAccess();

    expect(result.error).toBeInstanceOf(Response);
    expect(result.error?.status).toBe(403);
    expect(findByIdMock).toHaveBeenCalledWith('u1');
  });

  it('allows the request when the DB confirms admin', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { id: 'u2', role: 'admin' } } as never);
    leanMock.mockResolvedValue({ role: 'admin' });

    const result = await verifyAdminAccess();

    expect(result.error).toBeUndefined();
    expect(result.session).toBeDefined();
  });

  it('rejects when the user no longer exists in the database', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { id: 'gone', role: 'admin' } } as never);
    leanMock.mockResolvedValue(null);

    const result = await verifyAdminAccess();

    expect(result.error?.status).toBe(403);
  });

  it('returns 401 when there is no session at all', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);

    const result = await verifyAdminAccess();

    expect(result.error?.status).toBe(401);
    expect(findByIdMock).not.toHaveBeenCalled();
  });
});
