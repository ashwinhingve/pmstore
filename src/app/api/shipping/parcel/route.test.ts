import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  access: vi.fn(), exists: vi.fn(), update: vi.fn(), estimate: vi.fn(), book: vi.fn(), find: vi.fn(),
}));
vi.mock('@/lib/auth-helpers', () => ({ verifyAdminAccess: mocks.access }));
vi.mock('@/lib/middleware/rateLimit', () => ({ applyRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock('@/models/Shipment', () => ({ default: { exists: mocks.exists } }));
vi.mock('@/models/Order', () => ({ default: { findOneAndUpdate: mocks.update, findById: mocks.find } }));
vi.mock('@/lib/shipping/estimate', () => ({ estimateDelhivery: mocks.estimate }));
vi.mock('@/lib/shipping/createShipmentForOrder', () => ({ createShipmentForOrder: mocks.book }));

import { POST as saveParcel } from './route';
import { POST as createShipment } from '../create/route';

const orderId = '6af6f083f3055958783fb6b2';
const parcel = { weightGrams: 200, lengthCm: 15, widthCm: 10, heightCm: 5 };
const request = (body: unknown) => new NextRequest('http://localhost/api/shipping/parcel', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-internal-secret': 'not-an-admin' }, body: JSON.stringify(body),
});
beforeEach(() => {
  mocks.access.mockResolvedValue({ session: { user: { id: 'admin-user' } } });
  mocks.exists.mockResolvedValue(null);
});
afterEach(() => vi.resetAllMocks());

describe('admin parcel and booking boundary', () => {
  it('rejects unauthenticated/internal requests before touching parcel or courier data', async () => {
    mocks.access.mockResolvedValue({ error: new Response('Unauthorized', { status: 401 }) });
    expect((await saveParcel(request({ orderId, parcel }))).status).toBe(401);
    expect((await createShipment(request({ orderId }))).status).toBe(401);
    expect(mocks.exists).not.toHaveBeenCalled();
    expect(mocks.book).not.toHaveBeenCalled();
  });
  it('rejects missing measurements and caller-supplied confirmation identities', async () => {
    expect((await saveParcel(request({ orderId, parcel: { weightGrams: 200 } }))).status).toBe(400);
    expect((await saveParcel(request({ orderId, parcel: { ...parcel, confirmedBy: 'forged-admin' } }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('does not rewrite the local record of an existing AWB', async () => {
    mocks.exists.mockResolvedValue({ _id: 'existing' });
    expect((await saveParcel(request({ orderId, parcel }))).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('saves only server-attributed parcel measurements without changing customer totals', async () => {
    mocks.update.mockReturnValue({ populate: vi.fn().mockResolvedValue({ _id: orderId }) });
    const response = await saveParcel(request({ orderId, parcel, action: 'confirm' }));
    expect(response.status).toBe(200);
    const update = mocks.update.mock.calls[0][1];
    expect(update.$set.confirmedParcel).toMatchObject({ ...parcel, confirmedBy: 'admin-user', confirmedAt: expect.any(Date) });
    expect(Object.keys(update.$set)).toEqual(['confirmedParcel']);
    expect(mocks.estimate).not.toHaveBeenCalled();
    expect(mocks.book).not.toHaveBeenCalled();
  });
  it('cannot book using a forged packed weight in the booking request', async () => {
    expect((await createShipment(request({ orderId, parcel }))).status).toBe(400);
    expect(mocks.book).not.toHaveBeenCalled();
  });
});
