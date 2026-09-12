import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// The orchestrator calls connectDB(); we drive our own in-memory connection instead.
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

let mongo: MongoMemoryServer;
let requestPickupForOrder: (orderId: string, pickupDate?: string) => Promise<any>;
let Shipment: any;

beforeAll(async () => {
  // Provider singletons read these at construction — set before importing.
  process.env.DELHIVERY_API_KEY = 'test-key';
  process.env.DELHIVERY_RETURN_NAME = 'Pratigya Medical Store';
  process.env.SHIPROCKET_EMAIL = 'store@example.com';
  process.env.SHIPROCKET_PASSWORD = 'secret';

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  ({ requestPickupForOrder } = await import('./requestPickupForOrder'));
  Shipment = (await import('@/models/Shipment')).default;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
  vi.restoreAllMocks();
});

function shipmentDoc(over: Record<string, any>) {
  return {
    orderId: new mongoose.Types.ObjectId(),
    waybill: `WB-${Math.random().toString(36).slice(2)}`,
    provider: 'shiprocket',
    providerShipmentId: '1',
    shipmentStatus: 'Pending',
    scans: [],
    ...over,
  };
}

describe('requestPickupForOrder', () => {
  it('refuses when no shipment exists yet', async () => {
    const res = await requestPickupForOrder(new mongoose.Types.ObjectId().toString());
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Create a shipment/i);
  });

  it('skips local hand-delivery (manual) shipments', async () => {
    const doc = shipmentDoc({ provider: 'manual', providerShipmentId: '' });
    await Shipment.create(doc);
    const res = await requestPickupForOrder(doc.orderId.toString());
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Local delivery/i);
  });

  it('is idempotent when a pickup was already requested', async () => {
    const doc = shipmentDoc({ pickupId: 'EXISTING', pickupScheduledDate: new Date('2026-09-12') });
    await Shipment.create(doc);
    global.fetch = vi.fn() as any;

    const res = await requestPickupForOrder(doc.orderId.toString());

    expect(res.success).toBe(true);
    expect(res.pickupId).toBe('EXISTING');
    expect((global.fetch as any).mock.calls.length).toBe(0);
  });

  it('schedules a Shiprocket pickup per shipment and persists it', async () => {
    const doc = shipmentDoc({ provider: 'shiprocket', providerShipmentId: '55555' });
    await Shipment.create(doc);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'jwt' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pickup_status: 1, response: { pickup_token_number: 'PT1', pickup_scheduled_date: '2026-09-13 00:00:00' } }),
      }) as any;

    const res = await requestPickupForOrder(doc.orderId.toString());

    expect(res.success).toBe(true);
    expect(res.pickupId).toBe('PT1');

    const saved = await Shipment.findOne({ orderId: doc.orderId });
    expect(saved.pickupId).toBe('PT1');
    expect(saved.pickupStatus).toBe('Scheduled');
  });

  it('books one Delhivery pickup for the day and reuses it for later same-day orders', async () => {
    const d1 = shipmentDoc({ provider: 'delhivery', providerShipmentId: 'D1', waybill: 'D1' });
    const d2 = shipmentDoc({ provider: 'delhivery', providerShipmentId: 'D2', waybill: 'D2' });
    await Shipment.create(d1);
    await Shipment.create(d2);

    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pickup_id: 777 }) }) as any;

    const r1 = await requestPickupForOrder(d1.orderId.toString(), '2026-09-12');
    expect(r1.success).toBe(true);
    expect(r1.pickupId).toBe('777');
    expect((global.fetch as any).mock.calls.length).toBe(1);

    const r2 = await requestPickupForOrder(d2.orderId.toString(), '2026-09-12');
    expect(r2.success).toBe(true);
    expect(r2.reused).toBe(true);
    expect(r2.pickupId).toBe('777');
    // No second Delhivery API call — the day's pickup was reused.
    expect((global.fetch as any).mock.calls.length).toBe(1);

    const saved = await Shipment.findOne({ orderId: d2.orderId });
    expect(saved.pickupId).toBe('777');
  });
});
