import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defaultPickupDate } from './delhivery';

describe('defaultPickupDate', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(defaultPickupDate(new Date('2026-09-12T05:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses today when raised before the IST cutoff', () => {
    // 05:00 UTC = 10:30 IST, before the 15:00 cutoff
    expect(defaultPickupDate(new Date('2026-09-12T05:00:00Z'))).toBe('2026-09-12');
  });

  it('rolls to the next day after the IST cutoff', () => {
    // 12:00 UTC = 17:30 IST, past the cutoff
    expect(defaultPickupDate(new Date('2026-09-12T12:00:00Z'))).toBe('2026-09-13');
  });

  it('crosses a month boundary correctly in IST', () => {
    // 20:00 UTC on 30 Sep = 01:30 IST on 1 Oct, before the cutoff
    expect(defaultPickupDate(new Date('2026-09-30T20:00:00Z'))).toBe('2026-10-01');
  });
});

describe('DelhiveryService.requestPickup', () => {
  let requestPickup: (data: any) => Promise<any>;

  beforeEach(async () => {
    vi.stubEnv('DELHIVERY_API_KEY', 'test-key');
    vi.stubEnv('DELHIVERY_RETURN_NAME', 'Pratigya Medical Store');
    vi.resetModules();
    const mod = await import('./delhivery');
    requestPickup = mod.delhiveryService.requestPickup.bind(mod.delhiveryService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('books a pickup and returns the pickup id, hitting fm/request/new/', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pickup_id: 123456 }) }) as any;

    const res = await requestPickup({ providerShipmentId: 'WB1', pickupDate: '2026-09-12', packageCount: 2 });

    expect(res.success).toBe(true);
    expect(res.result.pickupId).toBe('123456');
    expect(res.result.scheduledDate).toBe('2026-09-12');

    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/fm/request/new/');
    expect(opts.headers.Authorization).toBe('Token test-key');
    expect(JSON.parse(opts.body)).toMatchObject({
      pickup_location: 'Pratigya Medical Store',
      pickup_date: '2026-09-12',
      expected_package_count: 2,
    });
  });

  it('maps an already-exists response to a readable, non-error-shaped message', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ pr_exist: 'Pickup request already exists' }) }) as any;

    const res = await requestPickup({ providerShipmentId: 'WB1', pickupDate: '2026-09-12' });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already scheduled for 2026-09-12/i);
  });

  it('surfaces an unregistered-warehouse error with guidance', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ error: 'client warehouse not found' }) }) as any;

    const res = await requestPickup({ providerShipmentId: 'WB1' });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/register it in the Delhivery One dashboard/i);
  });

  it('defaults expected_package_count to 1', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pickup_id: 1 }) }) as any;

    await requestPickup({ providerShipmentId: 'WB1', pickupDate: '2026-09-12' });

    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.expected_package_count).toBe(1);
  });
});
