import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShipmentCreationData } from './types';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

const data: ShipmentCreationData = {
  orderId: 'test', orderNumber: 'TEST', customerName: 'Test', customerPhone: '9999999999',
  deliveryAddress: { line1: 'Test street', city: 'Delhi', state: 'Delhi', pincode: '110001', country: 'India' },
  items: [{ name: 'Medicine', sku: 'MED', quantity: 7, price: 10 }],
  totalWeight: 200, totalValue: 70,
  parcel: { weightGrams: 200, lengthCm: 15, widthCm: 10, heightCm: 5 },
  paymentMethod: 'prepaid',
};

describe('Delhivery manifestation payload', () => {
  it.each(['cod', 'prepaid'] as const)('sends a single measured parcel and correct %s collection', async (paymentMethod) => {
    vi.stubEnv('DELHIVERY_API_KEY', 'test');
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, packages: [{ waybill: 'TEST' }] }) });
    vi.stubGlobal('fetch', fetch);
    const { delhiveryService } = await import('./delhivery');
    await delhiveryService.createShipment({ ...data, paymentMethod, codAmount: paymentMethod === 'cod' ? 80 : undefined });
    const payload = JSON.parse(new URLSearchParams(fetch.mock.calls[0][1].body).get('data')!);
    expect(payload.shipments).toHaveLength(1);
    expect(payload.shipments[0]).toMatchObject({ weight: '200', shipment_length: '15', shipment_width: '10', shipment_height: '5', shipping_mode: 'Surface', cod_amount: paymentMethod === 'cod' ? '80' : '0' });
  });
});

describe('snapshotted pickup origin', () => {
  it('uses the order warehouse rather than a changed environment default', async () => {
    vi.stubEnv('DELHIVERY_API_KEY', 'test'); vi.stubEnv('DELHIVERY_RETURN_PINCODE', '400001');
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, packages: [{ waybill: 'TEST' }] }) });
    vi.stubGlobal('fetch', fetch);
    const { delhiveryService } = await import('./delhivery');
    await delhiveryService.createShipment({ ...data, pickupLocation: { id: 'saved', name: 'Saved pickup', active: true, delhiveryWarehouse: 'Registered saved warehouse', shiprocketWarehouse: '', pincode: '462041', address: 'Saved warehouse address', city: 'Bhopal', state: 'MP', country: 'India', phone: '9999999999', freeDeliveryPincodes: [] } });
    const payload = JSON.parse(new URLSearchParams(fetch.mock.calls[0][1].body).get('data')!);
    expect(payload.pickup_location).toMatchObject({ name: 'Registered saved warehouse', pin_code: '462041', city: 'Bhopal' });
    expect(payload.shipments[0]).toMatchObject({ return_pin: '462041', seller_name: 'Registered saved warehouse' });
  });
});

describe('Shiprocket manifestation payload', () => {
  it.each(['cod', 'prepaid'] as const)('converts packed grams to kg and preserves %s totals', async (paymentMethod) => {
    vi.stubEnv('SHIPROCKET_EMAIL', 'test@example.com');
    vi.stubEnv('SHIPROCKET_PASSWORD', 'test');
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'test-token' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { shipping_address: [] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ shipment_id: 123, awb_code: 'TEST' }) });
    vi.stubGlobal('fetch', fetch);
    const { shiprocketService } = await import('./shiprocket');
    const result = await shiprocketService.createShipment({ ...data, paymentMethod, codAmount: paymentMethod === 'cod' ? 80 : undefined });
    expect(result.success).toBe(true);
    const payload = JSON.parse(fetch.mock.calls[2][1].body);
    expect(payload).toMatchObject({
      weight: 0.2, length: 15, breadth: 10, height: 5,
      payment_method: paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: paymentMethod === 'cod' ? 80 : 70,
      shipping_charges: 0, transaction_charges: 0,
    });
  });
});
