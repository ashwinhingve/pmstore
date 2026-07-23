import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * RBAC tests for middleware.ts (docs/PHASE-0-PATCHES.md §2).
 *
 * The middleware is the path-based gate:
 *   - /admin/* and /api/admin/*                -> admin OR staff
 *   - /admin/settings, /admin/users and the
 *     /api/admin/{settings,users,bulk-price,
 *     bulk-stock} subset                       -> admin ONLY
 *
 * Denial shape (confirmed with the client):
 *   - /api/* paths -> 403 JSON (401 when unauthenticated)
 *   - page paths   -> redirect (login when unauthenticated, home when wrong role)
 *
 * getToken is mocked so we drive role scenarios without a real session cookie.
 */

const getToken = vi.fn();
vi.mock('next-auth/jwt', () => ({
  getToken: (...args: unknown[]) => getToken(...args),
}));

// Imported after the mock is registered.
const { middleware } = await import('../../middleware');

function request(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${pathname}`));
}

const CLIENT = { id: 'u_client', email: 'c@example.com', role: 'client' };
const STAFF = { id: 'u_staff', email: 's@example.com', role: 'staff' };
const ADMIN = { id: 'u_admin', email: 'a@example.com', role: 'admin' };

function isRedirect(res: Response) {
  return res.status >= 300 && res.status < 400 && !!res.headers.get('location');
}

beforeEach(() => {
  getToken.mockReset();
});

describe('(a) client role is denied on every admin surface', () => {
  const pagePaths = ['/admin/dashboard', '/admin/products', '/admin/orders'];
  const apiPaths = [
    '/api/admin/products',
    '/api/admin/categories',
    '/api/admin/settings',
    '/api/admin/orders/o1/status',
  ];

  it.each(pagePaths)('redirects a client away from page %s', async (path) => {
    getToken.mockResolvedValue(CLIENT);
    const res = await middleware(request(path));
    expect(isRedirect(res)).toBe(true);
  });

  it.each(apiPaths)('returns 403 for a client on API %s', async (path) => {
    getToken.mockResolvedValue(CLIENT);
    const res = await middleware(request(path));
    expect(res.status).toBe(403);
  });
});

describe('(b) staff role: allowed on general admin, denied on the sensitive subset', () => {
  const allowedForStaff = ['/admin/dashboard', '/admin/products', '/api/admin/products'];
  const adminOnlyPages = ['/admin/settings', '/admin/users'];
  const adminOnlyApis = [
    '/api/admin/settings',
    '/api/admin/users',
    '/api/admin/bulk-price',
    '/api/admin/bulk-stock',
  ];

  it.each(allowedForStaff)('lets staff through %s', async (path) => {
    getToken.mockResolvedValue(STAFF);
    const res = await middleware(request(path));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it.each(adminOnlyPages)('redirects staff away from admin-only page %s', async (path) => {
    getToken.mockResolvedValue(STAFF);
    const res = await middleware(request(path));
    expect(isRedirect(res)).toBe(true);
  });

  it.each(adminOnlyApis)('returns 403 for staff on admin-only API %s', async (path) => {
    getToken.mockResolvedValue(STAFF);
    const res = await middleware(request(path));
    expect(res.status).toBe(403);
  });

  it('lets admin through the sensitive subset', async () => {
    getToken.mockResolvedValue(ADMIN);
    for (const path of [...adminOnlyPages, ...adminOnlyApis]) {
      const res = await middleware(request(path));
      expect(res.status).toBe(200);
    }
  });
});

describe('unauthenticated access (regression guard)', () => {
  it('redirects an anonymous user to /login on a page route', async () => {
    getToken.mockResolvedValue(null);
    const res = await middleware(request('/admin/dashboard'));
    expect(isRedirect(res)).toBe(true);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('returns 401 for an anonymous user on an admin API route', async () => {
    getToken.mockResolvedValue(null);
    const res = await middleware(request('/api/admin/products'));
    expect(res.status).toBe(401);
  });
});
