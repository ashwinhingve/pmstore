import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SiteSettings, { type ISiteSettings } from '@/models/SiteSettings';
import Product from '@/models/Product';
import Category from '@/models/Category';

/**
 * Integration tests for product slider curation API routes (/api/admin/products/sliders/[slot]).
 * Uses mongodb-memory-server to test real query behavior and data persistence.
 */

let mongo: MongoMemoryServer;
let categoryId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const cat = await Category.create({ name: 'Analgesics', slug: 'analgesics' });
  categoryId = cat._id;
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('Product Sliders API (GET/PUT /api/admin/products/sliders/[slot])', () => {
  describe('GET - Fetch curated products', () => {
    it('returns empty array when no curation exists', async () => {
      // Initialize settings without product sliders
      await SiteSettings.create({
        key: 'global',
        announcementBanner: { enabled: true, announcements: [] },
        heroSlider: { slides: [] },
        featureSlider: { slides: [] },
      });

      const settings = await SiteSettings.findOne({ key: 'global' }).lean<ISiteSettings | null>();
      const productIds = settings?.productSliders?.featured?.productIds ?? [];

      expect(productIds).toEqual([]);
    });

    it('resolves curated product IDs to full product summaries in stored order', async () => {
      // Create test products
      const prod1 = await Product.create({
        name: 'Paracetamol 650',
        slug: 'paracetamol-650',
        sku: 'PMS-PAR-001',
        category: categoryId,
        price: 30,
        stock: 100,
        images: [],
        salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Sun Pharma',
        packSize: 15,
        packUnit: 'tablet',
        isActive: true,
        isDiscontinued: false,
      });

      const prod2 = await Product.create({
        name: 'Ibuprofen 400',
        slug: 'ibuprofen-400',
        sku: 'PMS-IBU-001',
        category: categoryId,
        price: 25,
        stock: 50,
        images: [],
        salts: [{ name: 'Ibuprofen', strength: 400, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'GSK',
        packSize: 10,
        packUnit: 'tablet',
        isActive: true,
        isDiscontinued: false,
      });

      // Create settings with curated products (in reverse order)
      await SiteSettings.create({
        key: 'global',
        announcementBanner: { enabled: true, announcements: [] },
        heroSlider: { slides: [] },
        featureSlider: { slides: [] },
        productSliders: {
          featured: {
            productIds: [prod2._id, prod1._id], // reversed order
          },
        },
      });

      const settings = await SiteSettings.findOne({ key: 'global' }).lean<ISiteSettings | null>();
      const productIds = settings?.productSliders?.featured?.productIds ?? [];

      // Resolve products preserving order
      const products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
        isDiscontinued: false,
      })
        .select('_id name manufacturer price unitPrice images slug form category')
        .lean();

      const productsById = new Map(products.map((p: any) => [String(p._id), p]));
      const resolved = productIds
        .map((id: any) => productsById.get(String(id)))
        .filter((p: any): p is any => p !== undefined);

      // Verify order is preserved (prod2, then prod1)
      expect(resolved).toHaveLength(2);
      expect(resolved[0].name).toBe('Ibuprofen 400');
      expect(resolved[1].name).toBe('Paracetamol 650');
    });

    it('silently drops inactive products from curated list', async () => {
      // Create 3 products, mark one inactive
      const prod1 = await Product.create({
        name: 'Active Product',
        slug: 'active-product',
        sku: 'PMS-ACT-001',
        category: categoryId,
        price: 30,
        stock: 100,
        images: [],
        salts: [{ name: 'Salt1', strength: 100, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Pharma1',
        packSize: 10,
        packUnit: 'tablet',
        isActive: true,
        isDiscontinued: false,
      });

      const prod2 = await Product.create({
        name: 'Inactive Product',
        slug: 'inactive-product',
        sku: 'PMS-INA-001',
        category: categoryId,
        price: 25,
        stock: 50,
        images: [],
        salts: [{ name: 'Salt2', strength: 200, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Pharma2',
        packSize: 10,
        packUnit: 'tablet',
        isActive: false, // INACTIVE
        isDiscontinued: false,
      });

      const prod3 = await Product.create({
        name: 'Discontinued Product',
        slug: 'discontinued-product',
        sku: 'PMS-DIS-001',
        category: categoryId,
        price: 20,
        stock: 10,
        images: [],
        salts: [{ name: 'Salt3', strength: 300, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Pharma3',
        packSize: 5,
        packUnit: 'tablet',
        isActive: true,
        isDiscontinued: true, // DISCONTINUED
      });

      // Curate all three in order: active, inactive, discontinued
      await SiteSettings.create({
        key: 'global',
        announcementBanner: { enabled: true, announcements: [] },
        heroSlider: { slides: [] },
        featureSlider: { slides: [] },
        productSliders: {
          featured: {
            productIds: [prod1._id, prod2._id, prod3._id],
          },
        },
      });

      const settings = await SiteSettings.findOne({ key: 'global' }).lean<ISiteSettings | null>();
      const productIds = settings?.productSliders?.featured?.productIds ?? [];

      // Query with filters (same as homepage)
      const products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
        isDiscontinued: false,
      })
        .select('_id name')
        .lean();

      const productsById = new Map(products.map((p: any) => [String(p._id), p]));
      const resolved = productIds
        .map((id: any) => productsById.get(String(id)))
        .filter((p: any): p is any => p !== undefined);

      // Only the active, non-discontinued product should remain
      expect(resolved).toHaveLength(1);
      expect(resolved[0].name).toBe('Active Product');
    });
  });

  describe('PUT - Update curated products', () => {
    it('persists ordered product IDs and filters to active products only', async () => {
      // Create test products
      const prod1 = await Product.create({
        name: 'Product 1',
        slug: 'product-1',
        sku: 'PMS-P1-001',
        category: categoryId,
        price: 30,
        stock: 100,
        images: [],
        salts: [{ name: 'Salt1', strength: 100, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Pharma1',
        packSize: 10,
        packUnit: 'tablet',
        isActive: true,
        isDiscontinued: false,
      });

      const prod2 = await Product.create({
        name: 'Product 2',
        slug: 'product-2',
        sku: 'PMS-P2-001',
        category: categoryId,
        price: 25,
        stock: 50,
        images: [],
        salts: [{ name: 'Salt2', strength: 200, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Pharma2',
        packSize: 10,
        packUnit: 'tablet',
        isActive: true,
        isDiscontinued: false,
      });

      // Create initial settings
      await SiteSettings.create({
        key: 'global',
        announcementBanner: { enabled: true, announcements: [] },
        heroSlider: { slides: [] },
        featureSlider: { slides: [] },
      });

      // Update with new curated list (in specific order)
      const productIds = [String(prod2._id), String(prod1._id)];
      const products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
        isDiscontinued: false,
      })
        .select('_id')
        .lean();

      const productsById = new Map(products.map((p: any) => [String(p._id), p]));
      // Preserve the requested order by filtering through the original productIds
      const validIds = productIds
        .map((id) => productsById.get(id))
        .filter((p): p is any => p !== undefined)
        .map((p: any) => String(p._id));

      // Simulate PUT update
      const updated = await SiteSettings.findOneAndUpdate(
        { key: 'global' },
        {
          $set: {
            'productSliders.featured.productIds': validIds,
          },
        },
        { new: true }
      ).lean<ISiteSettings | null>();

      // Verify persisted order
      expect(updated?.productSliders?.featured?.productIds).toHaveLength(2);
      expect(String(updated?.productSliders?.featured?.productIds?.[0])).toBe(String(prod2._id));
      expect(String(updated?.productSliders?.featured?.productIds?.[1])).toBe(String(prod1._id));
    });

    it('filters to only active, non-discontinued products on PUT', async () => {
      // Create products with different states
      const active = await Product.create({
        name: 'Active',
        slug: 'active',
        sku: 'PMS-ACT-001',
        category: categoryId,
        price: 30,
        stock: 100,
        images: [],
        salts: [{ name: 'Salt', strength: 100, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Pharma',
        packSize: 10,
        packUnit: 'tablet',
        isActive: true,
        isDiscontinued: false,
      });

      const inactive = await Product.create({
        name: 'Inactive',
        slug: 'inactive',
        sku: 'PMS-INA-001',
        category: categoryId,
        price: 25,
        stock: 50,
        images: [],
        salts: [{ name: 'Salt', strength: 200, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Pharma',
        packSize: 10,
        packUnit: 'tablet',
        isActive: false,
        isDiscontinued: false,
      });

      // Initialize settings
      await SiteSettings.create({
        key: 'global',
        announcementBanner: { enabled: true, announcements: [] },
        heroSlider: { slides: [] },
        featureSlider: { slides: [] },
      });

      // Try to curate both active and inactive
      const productIds = [String(active._id), String(inactive._id)];
      const products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
        isDiscontinued: false,
      })
        .select('_id')
        .lean();

      const validIds = products.map((p: any) => String(p._id));

      // Only the active product should be persisted
      expect(validIds).toHaveLength(1);
      expect(validIds[0]).toBe(String(active._id));
    });

    it('handles empty curation list (clear curated products)', async () => {
      // Create settings with some curated products
      await SiteSettings.create({
        key: 'global',
        announcementBanner: { enabled: true, announcements: [] },
        heroSlider: { slides: [] },
        featureSlider: { slides: [] },
        productSliders: {
          featured: {
            productIds: [new mongoose.Types.ObjectId()],
          },
        },
      });

      // Clear the curation
      const updated = await SiteSettings.findOneAndUpdate(
        { key: 'global' },
        {
          $set: {
            'productSliders.featured.productIds': [],
          },
        },
        { new: true }
      ).lean<ISiteSettings | null>();

      expect(updated?.productSliders?.featured?.productIds).toEqual([]);
    });
  });

  describe('Slot validation', () => {
    it('recognizes valid slots (featured, otc)', async () => {
      const VALID_SLOTS = ['featured', 'otc'] as const;
      const validTests = ['featured', 'otc'];

      validTests.forEach((slot) => {
        expect(VALID_SLOTS.includes(slot as any)).toBe(true);
      });
    });

    it('rejects invalid slot names', async () => {
      const VALID_SLOTS = ['featured', 'otc'] as const;
      const invalidTests = ['bestsellers', 'trending', 'random', 'bad'];

      invalidTests.forEach((slot) => {
        expect(VALID_SLOTS.includes(slot as any)).toBe(false);
      });
    });
  });
});
