import { beforeAll, afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Shipment from '@/models/Shipment';
import Order from '@/models/Order';
import { POST } from './route';
const { access } = vi.hoisted(() => ({ access: vi.fn() }));
vi.mock('@/lib/auth-helpers', () => ({ verifyAdminAccess: access }));
let mongo: MongoMemoryServer;
beforeAll(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); }, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(() => access.mockResolvedValue({ session: { user: { id: 'test-admin' } } }));
afterEach(async () => { await mongoose.connection.dropDatabase(); });
const request = (version = 0) => new NextRequest('http://localhost/api/admin/shipments/test/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 89, reference: 'synthetic-wallet-reference', source: 'wallet', status: 'paid', chargeDate: new Date().toISOString(), expectedVersion: version, verified: true }) });
describe('partner billing audit', () => {
  it('records an actual expense and its audit without changing customer totals; rejects stale updates', async () => {
    const orderId = new mongoose.Types.ObjectId(); const shipmentId = new mongoose.Types.ObjectId();
    await Order.collection.insertOne({ _id: orderId, shippingCost: 0, totalAmount: 100 });
    await Shipment.collection.insertOne({ _id: shipmentId, orderId, provider: 'delhivery', waybill: 'TEST-AWB' });
    const params = { params: Promise.resolve({ id: String(shipmentId) }) };
    expect((await POST(request(), params)).status).toBe(200);
    expect((await POST(request(), params)).status).toBe(409);
    const shipment = await Shipment.findById(shipmentId);
    expect(shipment.partnerBilling.amount).toBe(89);
    expect(shipment.partnerBilling.recordedBy).toBe('test-admin');
    expect(shipment.billingHistory).toHaveLength(1);
    const order = await Order.findById(orderId);
    expect(order.shippingCost).toBe(0); expect(order.totalAmount).toBe(100);
  });
  it('preserves billing when a shipment status loaded before recording is saved later', async () => {
    const orderId = new mongoose.Types.ObjectId(); const shipmentId = new mongoose.Types.ObjectId();
    await Shipment.collection.insertOne({ _id: shipmentId, orderId, provider: 'delhivery', waybill: 'LEGACY-AWB' });
    const oldStatusDocument = await Shipment.findById(shipmentId);
    expect((await POST(request(), { params: Promise.resolve({ id: String(shipmentId) }) })).status).toBe(200);
    oldStatusDocument.shipmentStatus = 'In Transit'; await oldStatusDocument.save();
    const saved = await Shipment.findById(shipmentId);
    expect(saved.billingVersion).toBe(1); expect(saved.billingHistory).toHaveLength(1); expect(saved.partnerBilling.amount).toBe(89);
  });

  it('rejects unauthorized requests before writing billing data', async () => {
    access.mockResolvedValue({ error: new Response('Forbidden', { status: 403 }) });
    expect((await POST(request(), { params: Promise.resolve({ id: String(new mongoose.Types.ObjectId()) }) })).status).toBe(403);
    expect(await Shipment.countDocuments()).toBe(0);
  });
});
