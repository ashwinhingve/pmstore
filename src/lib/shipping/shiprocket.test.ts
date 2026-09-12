import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ShiprocketService.requestPickup', () => {
  let requestPickup: (data: any) => Promise<any>;

  beforeEach(async () => {
    vi.stubEnv('SHIPROCKET_EMAIL', 'store@example.com');
    vi.stubEnv('SHIPROCKET_PASSWORD', 'secret');
    vi.resetModules();
    const mod = await import('./shiprocket');
    requestPickup = mod.shiprocketService.requestPickup.bind(mod.shiprocketService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('schedules a pickup for the shipment id and returns the token', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'jwt' }) }) // login
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pickup_status: 1,
          response: { pickup_token_number: 'PT123', pickup_scheduled_date: '2026-09-13 00:00:00' },
        }),
      }) as any;

    const res = await requestPickup({ providerShipmentId: '99999' });

    expect(res.success).toBe(true);
    expect(res.result.pickupId).toBe('PT123');
    expect(res.result.scheduledDate).toBe('2026-09-13');

    const pickupCall = (global.fetch as any).mock.calls[1];
    expect(pickupCall[0]).toContain('/courier/generate/pickup');
    expect(JSON.parse(pickupCall[1].body)).toEqual({ shipment_id: ['99999'] });
  });

  it('treats an already-queued response as success', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'jwt' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Already in Pickup Queue' }) }) as any;

    const res = await requestPickup({ providerShipmentId: '99999' });

    expect(res.success).toBe(true);
    expect(res.result.pickupId).toBe('');
    expect(res.result.message).toMatch(/already/i);
  });

  it('surfaces a genuine failure as an error', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'jwt' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Invalid shipment id' }) }) as any;

    const res = await requestPickup({ providerShipmentId: 'bad' });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid shipment id');
  });
});
