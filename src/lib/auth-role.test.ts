import { beforeEach, describe, expect, it, vi } from 'vitest';
const { lean } = vi.hoisted(() => ({ lean: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: () => ({ select: () => ({ lean }) }) } }));
import { currentRole } from './auth-role';
beforeEach(() => lean.mockReset());
describe('database role refresh', () => {
  it('reflects promotion and demotion without accepting session role claims', async () => {
    lean.mockResolvedValueOnce({ role: 'admin' }).mockResolvedValueOnce({ role: 'client' });
    expect(await currentRole('test')).toBe('admin');
    expect(await currentRole('test')).toBe('client');
  });
  it('does not retain privileges for deleted users or failed database reads', async () => {
    lean.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('DB unavailable'));
    expect(await currentRole('test')).toBe('client');
    expect(await currentRole('test')).toBe('client');
  });
});
