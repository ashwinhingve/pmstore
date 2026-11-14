import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Order, { type IOrder } from '@/models/Order';
import Shipment, { type IShipment } from '@/models/Shipment';
import OrderItem from '@/models/OrderItem';
import Product from '@/models/Product';
import Address from '@/models/Address';
import User from '@/models/User';
import { createLocalShipmentForOrder, createShipmentForOrder } from './createShipmentForOrder';
import type { ShipmentCreationData } from './types';

const { book } = vi.hoisted(() => ({ book: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('./providerFactory', () => ({
  getDefaultProvider: () => 'delhivery', getShippingProvider: () => ({ createShipment: book }),
}));
vi.mock('@/lib/notifications/email', () => ({ emailService: {} }));
vi.mock('@/lib/notifications/sms', () => ({ smsService: {} }));

let mongo: MongoMemoryServer;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Order.init(), Shipment.init()]);
}, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(() => {
  vi.stubEnv('DELHIVERY_API_KEY', 'test');
  vi.stubEnv('DELHIVERY_RETURN_PINCODE', '462041');
  vi.stubEnv('DELHIVERY_RETURN_NAME', 'Test warehouse');
  book.mockReset().mockResolvedValue({ success: true, result: { waybill: 'TEST-AWB', shipmentId: 'TEST-AWB', courierName: 'Delhivery', trackingUrl: 'https://example.com/track' } });
});
afterEach(async () => {
  await Promise.all([Order.deleteMany({}), Shipment.deleteMany({}), OrderItem.deleteMany({}), Product.deleteMany({}), Address.deleteMany({}), User.deleteMany({})]);
  vi.unstubAllEnvs();
});

async function fixture(method: 'cod' | 'upi' = 'cod', pincode = '110001') {
  const orderId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const addressId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const parcel = { weightGrams: 200, lengthCm: 15, widthCm: 10, heightCm: 5, confirmedAt: new Date(), confirmedBy: userId.toString() };
  await Product.collection.insertOne({ _id: productId, name: 'Legacy default', weight: 500, weightUnit: 'g' });
  await Address.collection.insertOne({ _id: addressId, fullName: 'Test', phoneNumber: '9999999999', postalCode: pincode, city: 'Test city', state: 'Delhi', addressLine1: 'Test address' });
  await User.collection.insertOne({ _id: userId, name: 'Test' });
  await Order.collection.insertOne({
    _id: orderId, orderNumber: 'ORD-WEIGHT-TEST', userId, shippingAddressId: addressId,
    subtotal: 1172.8, shippingCost: 0, taxAmount: 0, totalAmount: 1162.8,
    paymentMethod: method, paymentStatus: method === 'cod' ? 'pending' : 'paid',
    orderStatus: 'confirmed', items: [], confirmedParcel: parcel,
  });
  await OrderItem.collection.insertOne({ orderId, productId, productName: 'Legacy default', quantity: 7, priceAtPurchase: 10 });
  return { orderId: orderId.toString(), parcel };
}

describe('courier booking uses admin confirmed packed weight', () => {
  it.each(['cod', 'upi'] as const)('sends 200g once instead of 7 × 500g for %s', async (method) => {
    const { orderId, parcel } = await fixture(method);
    const result = await createShipmentForOrder(orderId, 'delhivery', false, { parcel });
    expect(result.success).toBe(true);
    const data = book.mock.calls[0][0] as ShipmentCreationData;
    expect(data.totalWeight).toBe(200);
    expect(data.parcel).toMatchObject(parcel);
    expect(data.paymentMethod).toBe(method === 'cod' ? 'cod' : 'prepaid');
    expect(data.codAmount).toBe(method === 'cod' ? 1162.8 : undefined);
    const shipment = await Shipment.findOne({ orderId }).lean<IShipment | null>();
    expect(shipment?.parcel?.weightGrams).toBe(200);
    const order = await Order.findById(orderId).lean<IOrder | null>();
    expect(order?.shippingCost).toBe(0);
    expect(order?.totalAmount).toBe(1162.8);
    expect(order?.shipmentBookingState).toBe('booked');
    expect((await createShipmentForOrder(orderId, 'delhivery', false, { parcel })).success).toBe(true);
    expect(book).toHaveBeenCalledTimes(1);
  });
  it('does not book from a payment callback or without confirmation', async () => {
    const { orderId } = await fixture('upi');
    expect((await createLocalShipmentForOrder(orderId)).success).toBe(true);
    expect((await createShipmentForOrder(orderId, 'delhivery', false)).success).toBe(false);
    expect(book).not.toHaveBeenCalled();
  });
  it('allows local delivery without courier measurements or a courier request', async () => {
    const { orderId } = await fixture('cod', '462041');
    expect((await createShipmentForOrder(orderId, 'delhivery', false)).success).toBe(true);
    expect(book).not.toHaveBeenCalled();
    expect((await Shipment.findOne({ orderId }))?.provider).toBe('manual');
  });
  it('serializes concurrent bookings with a database claim', async () => {
    const { orderId, parcel } = await fixture();
    const results = await Promise.all(Array.from({ length: 5 }, () => createShipmentForOrder(orderId, 'delhivery', false, { parcel })));
    expect(results.some(r => r.success)).toBe(true);
    expect(book).toHaveBeenCalledTimes(1);
    expect(await Shipment.countDocuments({ orderId })).toBe(1);
  });
  it('blocks a stale parcel confirmation', async () => {
    const { orderId, parcel } = await fixture();
    await Order.updateOne({ _id: orderId }, { $set: { 'confirmedParcel.confirmedAt': new Date(parcel.confirmedAt.getTime() + 1000) } });
    expect((await createShipmentForOrder(orderId, 'delhivery', false, { parcel })).success).toBe(false);
    expect(book).not.toHaveBeenCalled();
  });
  it('holds ambiguous booking failures for reconciliation instead of billing twice', async () => {
    const { orderId, parcel } = await fixture();
    book.mockRejectedValueOnce(new Error('timeout after remote booking'));
    expect((await createShipmentForOrder(orderId, 'delhivery', false, { parcel })).success).toBe(false);
    expect((await Order.findById(orderId))?.shipmentBookingState).toBe('uncertain');
    expect((await createShipmentForOrder(orderId, 'delhivery', false, { parcel })).success).toBe(false);
    expect(book).toHaveBeenCalledTimes(1);
  });
  it('keeps missing product weight unknown', () => {
    expect(new Product().weight).toBeUndefined();
  });
});
