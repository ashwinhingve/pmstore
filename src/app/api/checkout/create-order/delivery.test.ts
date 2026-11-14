import { beforeAll, afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Product from '@/models/Product';
import Address from '@/models/Address';
import Order from '@/models/Order';
import SiteSettings from '@/models/SiteSettings';
import { EMPTY_DELIVERY_POLICY } from '@/lib/shipping/delivery-policy';
import { POST } from './route';

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession: session }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/mongodb/connection', () => ({ default: vi.fn() }));
vi.mock('@/lib/middleware/rateLimit', () => ({ applyRateLimit: vi.fn().mockResolvedValue(null), RateLimitPresets: { CREATE_ORDER: {} } }));
let mongo: MongoMemoryServer;
beforeAll(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); }, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(() => session.mockReset());
afterEach(async () => { await mongoose.connection.dropDatabase(); });

async function setup() {
  const userId = new mongoose.Types.ObjectId(); const productId = new mongoose.Types.ObjectId(); const addressId = new mongoose.Types.ObjectId();
  session.mockResolvedValue({ user: { id: String(userId) } });
  await Product.collection.insertOne({ _id: productId, name: 'Test OTC', sku: 'TEST-OTC', price: 100, stock: 10, weight: 200, weightUnit: 'g', gstRate: 5, images: [], variants: [], prescriptionRequired: false });
  await Address.collection.insertOne({ _id: addressId, userId, fullName: 'Test', phoneNumber: '9999999999', postalCode: '110001', state: 'Delhi' });
  await SiteSettings.collection.insertOne({ key: 'global', delivery: { ...EMPTY_DELIVERY_POLICY, defaultPickupLocationId: 'a', pickupLocations: [{ id: 'a', name: 'Warehouse A', active: true, delhiveryWarehouse: 'Registered A', shiprocketWarehouse: '', pincode: '462041', address: 'Test address', city: 'Bhopal', state: 'MP', country: 'India', phone: '9999999999', freeDeliveryPincodes: ['110001'] }], freeDelivery: { enabled: true, showInBanner: true, bannerText: 'Free delivery on selected locations' } } });
  return new NextRequest('http://localhost/api/checkout/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ productId: String(productId), quantity: 1 }], shippingAddressId: String(addressId), expectedShippingCost: 0 }) });
}

describe('location offer at order creation', () => {
  it('stores an immutable origin and zero fee without another discount or partner booking', async () => {
    const request = await setup(); const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.order).toMatchObject({ shippingCost: 0, totalAmount: 100, discountAmount: 0, deliveryFeeReason: 'location' });
    await SiteSettings.updateOne({ key: 'global' }, { $set: { 'delivery.freeDelivery.enabled': false, 'delivery.pickupLocations.0.name': 'Changed warehouse' } });
    const order = await Order.findById(data.order._id);
    expect(order.pickupLocation.name).toBe('Warehouse A'); expect(order.shippingCost).toBe(0);
    expect(order.trackingNumber).toBeUndefined();
  });
  it('rejects stale free estimates before creating an order when the offer is disabled', async () => {
    const request = await setup();
    await SiteSettings.updateOne({ key: 'global' }, { $set: { 'delivery.freeDelivery.enabled': false } });
    const response = await POST(request);
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('SHIPPING_CHANGED');
    expect(await Order.countDocuments()).toBe(0);
  });
});
