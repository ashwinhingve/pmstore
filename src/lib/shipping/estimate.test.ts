import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { estimateDelhivery } from './estimate';

const parcel = { weightGrams: 200, lengthCm: 15, widthCm: 10, heightCm: 5 };

beforeEach(() => {
  vi.stubEnv('DELHIVERY_API_KEY', 'test-token');
  vi.stubEnv('DELHIVERY_RETURN_PINCODE', '462041');
  vi.stubEnv('DELHIVERY_BASE_URL', 'https://track.delhivery.com');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('read-only Delhivery estimate', () => {
  it.each(['prepaid', 'cod'] as const)('uses matched inputs for %s and never adds tax twice', async (mode) => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ total_amount: '46.02', gross_amount: 39, tax: 7.02 }] });
    vi.stubGlobal('fetch', fetch);
    const estimate = await estimateDelhivery({ ...parcel, confirmedAt: new Date(), confirmedBy: 'admin' } as typeof parcel, '110001', mode, 1162.8);
    expect(estimate.total).toBe(46.02); // synthetic fixture, not an observed live rate
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toBe('/api/kinko/v1/invoice/charges/.json');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      cgm: '200', md: 'S', o_pin: '462041', d_pin: '110001',
      pt: mode === 'cod' ? 'COD' : 'Pre-paid', cod: mode === 'cod' ? '1162.8' : '0',
    });
    expect(fetch.mock.calls[0][1].body).toBeUndefined();
  });
  it.each([{ response: [] }, { response: [{ total_amount: 'bad' }] }, { response: [{ total_amount: 0 }] }])('refuses unusable rates instead of inventing a price', async ({ response }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
    await expect(estimateDelhivery(parcel, '110001', 'prepaid', 0)).rejects.toThrow();
  });
  it('refuses missing origin configuration without a network call', async () => {
    vi.stubEnv('DELHIVERY_RETURN_PINCODE', '');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(estimateDelhivery(parcel, '110001', 'prepaid', 0)).rejects.toThrow(/pickup PIN/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
