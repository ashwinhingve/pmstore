import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '@/models/Product';
import Address from '@/models/Address';
import SiteSettings from '@/models/SiteSettings';
import { quoteCustomerDelivery } from './delivery-quote';
import { EMPTY_DELIVERY_POLICY, type PickupLocation } from '@/lib/shipping/delivery-policy';

let mongo: MongoMemoryServer;
beforeAll(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); }, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
afterEach(async () => { await mongoose.connection.dropDatabase(); });

describe('server verified customer delivery', () => {
  async function setup() {
    const userId = new mongoose.Types.ObjectId(); const addressId = new mongoose.Types.ObjectId(); const productId = new mongoose.Types.ObjectId();
    await Address.collection.insertOne({ _id: addressId, userId, postalCode: '110001' });
    await Product.collection.insertOne({ _id: productId, name: 'Test', isActive: true, price: 100, weight: 0.2, weightUnit: 'kg', variants: [] });
    const pickup: PickupLocation = { id: 'test', name: 'Test pickup', active: true, delhiveryWarehouse: 'Test registered warehouse', shiprocketWarehouse: '', pincode: '462041', address: 'Test warehouse', city: 'Bhopal', state: 'MP', country: 'India', phone: '9999999999', freeDeliveryPincodes: ['110001'] };
    await SiteSettings.collection.insertOne({ key: 'global', delivery: { ...EMPTY_DELIVERY_POLICY, pickupLocations: [pickup], defaultPickupLocationId: pickup.id, freeDelivery: { enabled: true, showInBanner: true, bannerText: 'Free delivery on selected locations' } } });
    return { userId: String(userId), input: { shippingAddressId: String(addressId), items: [{ productId: String(productId), quantity: 1 }] } };
  }
  it('uses configured origin, product price and owned address; offer toggles change only future quotes', async () => {
    const { userId, input } = await setup();
    const free = await quoteCustomerDelivery(input, userId);
    expect(free).toMatchObject({ subtotal: 100, shippingCost: 0, reason: 'location', pickup: { id: 'test', pincode: '462041' } });
    await SiteSettings.updateOne({ key: 'global' }, { $set: { 'delivery.freeDelivery.enabled': false } });
    const normal = await quoteCustomerDelivery(input, userId);
    expect(normal.shippingCost).toBeGreaterThan(0);
    expect(free.shippingCost).toBe(0);
  });
  it('does not expose another customer address or accept unavailable items', async () => {
    const { userId, input } = await setup();
    await expect(quoteCustomerDelivery(input, String(new mongoose.Types.ObjectId()))).rejects.toThrow(/your saved/);
    await Product.updateOne({ _id: input.items[0].productId }, { $set: { isActive: false } });
    await expect(quoteCustomerDelivery(input, userId)).rejects.toThrow(/unavailable/);
  });
});
