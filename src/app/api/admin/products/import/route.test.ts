import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { POST } from './route';

/**
 * Integration tests for bulk product import JSON path.
 * Uses mongodb-memory-server to test real database behavior:
 * - Products saved via .save() (not insertMany/updateMany)
 * - compositionKey/unitPrice computed by pre-validate hook
 * - Category upsert
 * - Per-row duplicate detection
 */

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

/**
 * Helper to create a mock NextRequest with JSON body
 */
function createJsonRequest(
  body: any,
  mode: 'validate' | 'commit' = 'validate'
): NextRequest {
  const jsonBody = JSON.stringify(body);
  const request = new NextRequest(
    new URL(`http://localhost:3000/api/admin/products/import?mode=${mode}`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonBody,
    }
  );
  return request;
}

describe('Bulk Product Import - JSON Path', () => {
  describe('Validate Mode', () => {
    it('validates a simple valid row', async () => {
      const body = {
        rows: [
          {
            sku: 'TEST001',
            name: 'Test Product',
            manufacturer: 'Test Pharma',
            category: 'Analgesics',
            salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
            form: 'tablet' as const,
            packSize: 10,
            packUnit: 'tablet',
            price: 100,
            gstRate: 18,
            stock: 50,
            scheduleClass: 'OTC' as const,
            prescriptionRequired: false,
            isActive: true,
          },
        ],
      };

      const request = createJsonRequest(body, 'validate');
      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(200);
      expect(result.data.mode).toBe('validate');
      expect(result.data.valid).toBe(1);
      expect(result.data.willCreate).toBe(1);
      expect(result.data.errors).toEqual([]);
    });

    it('validates multiple rows with duplicates', async () => {
      const body = {
        rows: [
          {
            sku: 'TEST001',
            name: 'Test Product',
            manufacturer: 'Test Pharma',
            category: 'Analgesics',
            salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
            form: 'tablet' as const,
            packSize: 10,
            packUnit: 'tablet',
            price: 100,
            gstRate: 18,
            stock: 50,
            scheduleClass: 'OTC' as const,
            isActive: true,
          },
          {
            sku: 'TEST001',
            name: 'Test Product Updated',
            manufacturer: 'Test Pharma',
            category: 'Analgesics',
            salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
            form: 'tablet' as const,
            packSize: 10,
            packUnit: 'tablet',
            price: 110,
            gstRate: 18,
            stock: 60,
            scheduleClass: 'OTC' as const,
            isActive: true,
          },
        ],
      };

      const request = createJsonRequest(body, 'validate');
      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(200);
      expect(result.data.duplicateSkusInFile).toContain('TEST001');
      expect(result.data.willCreate).toBe(1); // Only one will be created
      expect(result.data.willUpdate).toBe(1);
    });

    it('rejects rows with invalid Zod schema', async () => {
      const body = {
        rows: [
          {
            sku: 'TEST001',
            name: 'Test Product',
            category: 'Analgesics',
            salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
            form: 'tablet' as const,
            packSize: 10,
            packUnit: 'tablet',
            price: 100,
            gstRate: 18,
            isActive: true,
            // Missing manufacturer - will fail validation
          } as any,
        ],
      };

      const request = createJsonRequest(body, 'validate');
      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(400);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toBeDefined();
    });

    it('detects new categories', async () => {
      // Pre-create one category
      await Category.create({ name: 'Existing', slug: 'existing' });

      const body = {
        rows: [
          {
            sku: 'TEST001',
            name: 'Test Product',
            manufacturer: 'Test Pharma',
            category: 'New Category',
            salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
            form: 'tablet' as const,
            packSize: 10,
            packUnit: 'tablet',
            price: 100,
            gstRate: 18,
            isActive: true,
          },
        ],
      };

      const request = createJsonRequest(body, 'validate');
      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(200);
      expect(result.data.newCategories).toContain('New Category');
    });
  });

  describe('Commit Mode', () => {
    it('creates a product via .save() with computed compositionKey and unitPrice', async () => {
      const body = {
        rows: [
          {
            sku: 'PROD001',
            name: 'Aspirin 500mg',
            manufacturer: 'Bayer',
            category: 'Analgesics',
            salts: [{ name: 'Acetylsalicylic Acid', strength: 500, unit: 'mg' }],
            form: 'tablet',
            packSize: 30,
            packUnit: 'tablet',
            price: 150,
            mrp: 200,
            gstRate: 18,
            stock: 100,
            scheduleClass: 'OTC' as const,
            prescriptionRequired: false,
            isActive: true,
          },
        ],
      };

      const request = createJsonRequest(body, 'commit');
      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(200);
      expect(result.data.created).toBe(1);
      expect(result.data.updated).toBe(0);
      expect(result.data.failed).toBe(0);

      // Verify product was created in database
      const product = await Product.findOne({ sku: 'PROD001' }).select('+compositionKey +unitPrice +name +manufacturer +price +packSize').lean<any>();
      expect(product).toBeDefined();
      if (product) {
        expect(product.name).toBe('Aspirin 500mg');
        expect(product.manufacturer).toBe('Bayer');
        expect(product.price).toBe(150);
        expect(product.packSize).toBe(30);
        expect(product.compositionKey).toBeDefined();
        expect(typeof product.compositionKey).toBe('string');
        expect(product.unitPrice).toBe(5);
      }
    });

    it('updates an existing product via .save()', async () => {
      // Create initial product
      const cat = await Category.create({ name: 'Analgesics', slug: 'analgesics' });
      const initial = new Product({
        sku: 'PROD002',
        name: 'Old Name',
        slug: 'old-name',
        manufacturer: 'Old Pharma',
        category: cat._id,
        salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
        form: 'tablet',
        packSize: 10,
        packUnit: 'tablet',
        price: 100,
        gstRate: 18,
        stock: 50,
        scheduleClass: 'OTC',
        prescriptionRequired: false,
        isActive: true,
      });
      await initial.save();

      // Import with same SKU but updated fields
      const body = {
        rows: [
          {
            sku: 'PROD002',
            name: 'New Name',
            manufacturer: 'New Pharma',
            category: 'Analgesics',
            salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
            form: 'tablet' as const,
            packSize: 20,
            packUnit: 'tablet',
            price: 200,
            gstRate: 12,
            stock: 75,
            scheduleClass: 'OTC' as const,
            isActive: true,
          },
        ],
      };

      const request = createJsonRequest(body, 'commit');
      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(200);
      expect(result.data.created).toBe(0);
      expect(result.data.updated).toBe(1);

      // Verify product was updated
      const updated = await Product.findOne({ sku: 'PROD002' }).select('+name +manufacturer +price +packSize +unitPrice').lean<any>();
      expect(updated).toBeDefined();
      if (updated) {
        expect(updated.name).toBe('New Name');
        expect(updated.manufacturer).toBe('New Pharma');
        expect(updated.price).toBe(200);
        expect(updated.packSize).toBe(20);
        expect(updated.unitPrice).toBe(10);
      }
    });

    it('creates category if it does not exist', async () => {
      const body = {
        rows: [
          {
            sku: 'PROD003',
            name: 'Test Product',
            manufacturer: 'Test Pharma',
            category: 'Cardiac Care',
            salts: [{ name: 'Atenolol', strength: 50, unit: 'mg' }],
            form: 'tablet' as const,
            packSize: 15,
            packUnit: 'tablet',
            price: 120,
            gstRate: 5,
            stock: 80,
            scheduleClass: 'OTC' as const,
            isActive: true,
          },
        ],
      };

      const request = createJsonRequest(body, 'commit');
      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(200);
      expect(result.data.created).toBe(1);

      // Verify category was created
      const category = await Category.findOne({ name: 'Cardiac Care' }).lean<any>();
      expect(category).toBeDefined();
      if (category) {
        expect(category.slug).toBe('cardiac-care');
        // Verify product references the category
        const product = await Product.findOne({ sku: 'PROD003' }).select('+category').lean<any>();
        expect(product).toBeDefined();
        if (product) {
          expect(String(product.category)).toBe(String(category._id));
        }
      }
    });

    it('handles prescription-required schedule classes', async () => {
      const body = {
        rows: [
          {
            sku: 'PROD004',
            name: 'Schedule H Drug',
            manufacturer: 'Test Pharma',
            category: 'Cardiac',
            salts: [{ name: 'Amiodarone', strength: 200, unit: 'mg' }],
            form: 'tablet' as const,
            packSize: 14,
            packUnit: 'tablet',
            price: 500,
            gstRate: 12,
            stock: 20,
            scheduleClass: 'H' as const,
            prescriptionRequired: false,
            isActive: true,
          },
        ],
      };

      const request = createJsonRequest(body, 'commit');
      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(200);
      expect(result.data.created).toBe(1);

      // Verify prescriptionRequired was forced to true
      const product = await Product.findOne({ sku: 'PROD004' }).select('+prescriptionRequired +scheduleClass').lean<any>();
      expect(product).toBeDefined();
      if (product) {
        expect(product.prescriptionRequired).toBe(true);
        expect(product.scheduleClass).toBe('H');
      }
    });
  });

  describe('Images Handling', () => {
    it('includes pre-uploaded Cloudinary images in commit mode', async () => {
      const body = {
        rows: [
          {
            sku: 'PROD005',
            name: 'Product with Image',
            manufacturer: 'Test Pharma',
            category: 'Topical',
            salts: [{ name: 'Ibuprofen', strength: 5, unit: '%' }],
            form: 'cream' as const,
            packSize: 100,
            packUnit: 'g',
            price: 250,
            gstRate: 18,
            stock: 50,
            scheduleClass: 'OTC' as const,
            isActive: true,
            image: 'PROD005',
          },
        ],
        images: {
          PROD005: {
            url: 'https://res.cloudinary.com/pmstore/image/upload/v123/test.jpg',
            publicId: 'pmstore/test',
          },
        },
      };

      const request = createJsonRequest(body, 'commit');
      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(200);
      expect(result.data.created).toBe(1);

      // Verify image was added to product
      const product = await Product.findOne({ sku: 'PROD005' }).select('+images').lean<any>();
      expect(product).toBeDefined();
      if (product) {
        expect(product.images).toBeDefined();
        expect(product.images.length).toBeGreaterThan(0);
        const img = product.images.find((i: any) => i.publicId === 'pmstore/test');
        expect(img).toBeDefined();
        if (img) {
          expect(img.url).toContain('res.cloudinary.com');
        }
      }
    });
  });

  describe('CSV Path Unchanged', () => {
    it('still accepts and processes CSV text input', async () => {
      // Create a minimal CSV
      const csvText = `sku,name,manufacturer,category,form,salt_1_name,salt_1_strength,salt_1_unit,pack_size,pack_unit,price,gst_rate,stock,schedule_class,is_active
TEST-CSV,CSV Product,CSV Pharma,Pain Relief,tablet,Paracetamol,500,mg,20,tablet,80,18,100,OTC,TRUE`;

      const request = new NextRequest(
        new URL('http://localhost:3000/api/admin/products/import?mode=validate'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: csvText,
        }
      );

      vi.doMock('@/lib/auth-helpers', () => ({
        verifyAdminAccess: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const response = await POST(request);
      const result = await response.json() as any;

      expect(response.status).toBe(200);
      expect(result.data.mode).toBe('validate');
      // CSV parsing should work as before
    });
  });
});
