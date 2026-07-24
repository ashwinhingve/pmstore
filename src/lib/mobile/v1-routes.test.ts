import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  assertPrescriptionForCart,
  cartRequiresPrescription,
  PrescriptionRequiredError,
} from '@/lib/checkout/prescription-guard';
import { diffReorder, type ReorderLine, type ProductSnapshot } from '@/lib/orders/reorder';
import Product from '@/models/Product';
import Prescription from '@/models/Prescription';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';

/**
 * Tests for v1 mobile API route logic (Phase C).
 * Focuses on the lib functions the routes call, following docs/07-TESTING.md:
 * "do not mock Mongoose; the bugs live in the query and hook behaviour."
 */

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('v1 Routes — Rx Enforcement (POST /api/v1/checkout/create-order)', () => {
  const rxCart = [{ prescriptionRequired: true }];
  const NOW = 1_700_000_000_000;

  describe('cartRequiresPrescription', () => {
    it('returns true when cart has Rx items', () => {
      expect(cartRequiresPrescription(rxCart)).toBe(true);
    });

    it('returns false for OTC-only cart', () => {
      expect(cartRequiresPrescription([{ prescriptionRequired: false }])).toBe(false);
    });
  });

  describe('assertPrescriptionForCart', () => {
    it('allows OTC cart without prescription', () => {
      const otc = [{ prescriptionRequired: false }];
      expect(() => assertPrescriptionForCart(otc, null, 'user-1', NOW)).not.toThrow();
    });

    it('rejects Rx cart without prescription', () => {
      expect(() =>
        assertPrescriptionForCart(rxCart, null, 'user-1', NOW),
      ).toThrow(PrescriptionRequiredError);
    });

    it('allows Rx cart with pending prescription (same user)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const prescription = await Prescription.create({
        userId,
        images: [{ url: 'https://example.com/rx.jpg', publicId: 'rx1' }],
        status: 'pending',
      });
      const loaded = await Prescription.findById(prescription._id);

      expect(() =>
        assertPrescriptionForCart(rxCart, loaded, String(userId), NOW),
      ).not.toThrow();
    });

    it('allows Rx cart with verified prescription (same user)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const prescription = await Prescription.create({
        userId,
        images: [{ url: 'https://example.com/rx.jpg', publicId: 'rx2' }],
        status: 'verified',
        issueDate: new Date(NOW - 30 * 24 * 60 * 60 * 1000),
      });
      const loaded = await Prescription.findById(prescription._id);

      expect(() =>
        assertPrescriptionForCart(rxCart, loaded, String(userId), NOW),
      ).not.toThrow();
    });

    it("rejects Rx cart with prescription from another user", async () => {
      const owner = new mongoose.Types.ObjectId();
      const buyer = new mongoose.Types.ObjectId();
      const prescription = await Prescription.create({
        userId: owner,
        images: [{ url: 'https://example.com/rx.jpg', publicId: 'rx3' }],
        status: 'verified',
      });
      const loaded = await Prescription.findById(prescription._id);

      expect(() =>
        assertPrescriptionForCart(rxCart, loaded, String(buyer), NOW),
      ).toThrow(PrescriptionRequiredError);
    });

    it('rejects expired prescription (6+ months old)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const sixMonthsAgo = new Date(NOW - 200 * 24 * 60 * 60 * 1000);
      const prescription = await Prescription.create({
        userId,
        images: [{ url: 'https://example.com/rx.jpg', publicId: 'rx4' }],
        status: 'pending',
        issueDate: sixMonthsAgo,
      });
      const loaded = await Prescription.findById(prescription._id);

      expect(() =>
        assertPrescriptionForCart(rxCart, loaded, String(userId), NOW),
      ).toThrow(PrescriptionRequiredError);
    });

    it('rejects rejected prescription', async () => {
      const userId = new mongoose.Types.ObjectId();
      const prescription = await Prescription.create({
        userId,
        images: [{ url: 'https://example.com/rx.jpg', publicId: 'rx5' }],
        status: 'rejected',
        rejectionReason: 'Illegible image',
      });
      const loaded = await Prescription.findById(prescription._id);

      expect(() =>
        assertPrescriptionForCart(rxCart, loaded, String(userId), NOW),
      ).toThrow(PrescriptionRequiredError);
    });
  });
});

describe('v1 Routes — Reorder (POST /api/v1/orders/[id]/reorder)', () => {
  it('skips out-of-stock items', () => {
    const lines: ReorderLine[] = [
      { productId: 'p1', productName: 'Item 1', quantity: 2, priceAtPurchase: 50 },
    ];
    const products: Record<string, ProductSnapshot> = {
      p1: {
        _id: 'p1',
        name: 'Item 1',
        slug: 'item-1',
        price: 50,
        stock: 0, // out of stock
        isActive: true,
        isDiscontinued: false,
        prescriptionRequired: false,
      },
    };

    const diff = diffReorder(lines, products);
    expect(diff.skipped).toHaveLength(1);
    expect(diff.skipped[0].reason).toBe('out_of_stock');
    expect(diff.added).toHaveLength(0);
  });

  it('skips discontinued items', () => {
    const lines: ReorderLine[] = [
      { productId: 'p1', productName: 'Item 1', quantity: 1, priceAtPurchase: 50 },
    ];
    const products: Record<string, ProductSnapshot> = {
      p1: {
        _id: 'p1',
        name: 'Item 1',
        slug: 'item-1',
        price: 50,
        stock: 10,
        isActive: true,
        isDiscontinued: true,
        prescriptionRequired: false,
      },
    };

    const diff = diffReorder(lines, products);
    expect(diff.skipped).toHaveLength(1);
    expect(diff.skipped[0].reason).toBe('unavailable');
  });

  it('skips prescription-required items (must re-upload Rx)', () => {
    const lines: ReorderLine[] = [
      { productId: 'p1', productName: 'Item 1', quantity: 1, priceAtPurchase: 50 },
    ];
    const products: Record<string, ProductSnapshot> = {
      p1: {
        _id: 'p1',
        name: 'Item 1',
        slug: 'item-1',
        price: 50,
        stock: 10,
        isActive: true,
        isDiscontinued: false,
        prescriptionRequired: true, // Now requires Rx
      },
    };

    const diff = diffReorder(lines, products);
    expect(diff.skipped).toHaveLength(1);
    expect(diff.skipped[0].reason).toBe('prescription_required');
  });

  it('adds available items and detects price changes', () => {
    const lines: ReorderLine[] = [
      { productId: 'p1', productName: 'Item 1', quantity: 5, priceAtPurchase: 50 },
    ];
    const products: Record<string, ProductSnapshot> = {
      p1: {
        _id: 'p1',
        name: 'Item 1',
        slug: 'item-1',
        price: 60, // Price went up
        stock: 100,
        isActive: true,
        isDiscontinued: false,
        prescriptionRequired: false,
      },
    };

    const diff = diffReorder(lines, products);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].priceChanged).toBe(true);
    expect(diff.added[0].price).toBe(60);
    expect(diff.skipped).toHaveLength(0);
  });

  it('adjusts quantity when stock is insufficient', () => {
    const lines: ReorderLine[] = [
      { productId: 'p1', productName: 'Item 1', quantity: 100, priceAtPurchase: 50 },
    ];
    const products: Record<string, ProductSnapshot> = {
      p1: {
        _id: 'p1',
        name: 'Item 1',
        slug: 'item-1',
        price: 50,
        stock: 10, // Only 10 in stock
        isActive: true,
        isDiscontinued: false,
        prescriptionRequired: false,
      },
    };

    const diff = diffReorder(lines, products);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].quantity).toBe(10); // Capped at stock level
    expect(diff.added[0].quantityAdjusted).toBe(true);
  });
});

describe('v1 Routes — Order data integrity', () => {
  it('preserves _id serialization on order retrieval', async () => {
    const order = await Order.create({
      orderNumber: 'ORD-TEST-001',
      userId: new mongoose.Types.ObjectId(),
      items: [],
      subtotal: 500,
      shippingCost: 50,
      taxAmount: 0,
      totalAmount: 550,
      orderStatus: 'pending',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      shippingAddressId: new mongoose.Types.ObjectId(),
      shippingProvider: 'delhivery',
      shippingMethod: 'standard',
    });

    const loaded = await Order.findById(order._id).lean();
    expect(loaded).toBeDefined();
    if (loaded && typeof loaded === 'object' && '_id' in loaded) {
      // In the route, we'd serialize: String(loaded._id)
      expect(String(loaded._id)).toMatch(/^[a-f0-9]{24}$/i);
    }
  });

  it('includes order items after population', async () => {
    const userId = new mongoose.Types.ObjectId();
    const order = await Order.create({
      orderNumber: 'ORD-TEST-002',
      userId,
      items: [],
      subtotal: 500,
      shippingCost: 50,
      taxAmount: 0,
      totalAmount: 550,
      orderStatus: 'pending',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      shippingAddressId: new mongoose.Types.ObjectId(),
      shippingProvider: 'delhivery',
      shippingMethod: 'standard',
    });

    const item = await OrderItem.create({
      orderId: order._id,
      productId: new mongoose.Types.ObjectId(),
      quantity: 2,
      priceAtPurchase: 100,
      subtotal: 200,
      productName: 'Test',
      productSku: 'TEST',
    });

    order.items = [item._id];
    await order.save();

    const populated = await Order.findById(order._id).populate('items').lean() as any;
    expect(Array.isArray(populated?.items)).toBe(true);
    expect(populated?.items).toHaveLength(1);
  });
});
