import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { bulkRowToParsedProductRow } from '@/lib/import/bulk-row-converter';
import type { BulkProductRow } from '@/lib/validations/bulk-product-import';

/**
 * Integration tests for bulk product import JSON path.
 * Tests:
 * 1. Conversion logic (bulkRowToParsedProductRow) against real DB
 * 2. Integration with Product.save() and pre-validate hook
 * 3. Critical feature: Schedule H/H1/X prescription enforcement
 *
 * (HTTP route tests skipped due to app architecture: route imports connectDB
 * which checks MONGODB_URI at module load, before test can set up in-memory server.
 * Feature verification focuses on actual logic, not HTTP wrapper.)
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

describe('Bulk Product Import - JSON Path (Feature 3)', () => {
  describe('BulkProductRow → ParsedProductRow conversion', () => {
    it('converts valid JSON row to ParsedProductRow', () => {
      const bulkRow: BulkProductRow = {
        sku: 'TEST-001',
        name: 'Test Product',
        manufacturer: 'Test Pharma',
        category: 'Analgesics',
        salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
        form: 'tablet',
        packSize: 30,
        packUnit: 'tablet',
        price: 150,
        gstRate: 18,
        stock: 100,
        scheduleClass: 'OTC',
        prescriptionRequired: false,
        description: '',
        sideEffects: [],
        contraindications: [],
        tags: [],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);

      expect(parsed.sku).toBe('TEST-001');
      expect(parsed.name).toBe('Test Product');
      expect(parsed.salts).toHaveLength(1);
      expect(parsed.prescriptionRequired).toBe(false);
    });

    it('CRITICAL: enforces Schedule H → prescriptionRequired=true', () => {
      const bulkRow: BulkProductRow = {
        sku: 'AMIO-200',
        name: 'Amiodarone 200mg',
        manufacturer: 'Cipla',
        category: 'Cardiac',
        salts: [{ name: 'Amiodarone', strength: 200, unit: 'mg' }],
        form: 'tablet',
        packSize: 14,
        packUnit: 'tablet',
        price: 500,
        gstRate: 12,
        stock: 20,
        scheduleClass: 'H',
        prescriptionRequired: false, // Input says false
        description: '',
        sideEffects: [],
        contraindications: [],
        tags: [],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);

      // CLAUDE.md non-negotiable #3: H drugs ALWAYS require prescription
      expect(parsed.prescriptionRequired).toBe(true);
      expect(parsed.scheduleClass).toBe('H');
    });

    it('enforces Schedule H1 → prescriptionRequired=true', () => {
      const bulkRow: BulkProductRow = {
        sku: 'PROP-50',
        name: 'Propranolol 50mg',
        manufacturer: 'Abbott',
        category: 'Cardiac',
        salts: [{ name: 'Propranolol', strength: 50, unit: 'mg' }],
        form: 'tablet',
        packSize: 30,
        packUnit: 'tablet',
        price: 150,
        gstRate: 12,
        stock: 50,
        scheduleClass: 'H1',
        prescriptionRequired: false,
        description: '',
        sideEffects: [],
        contraindications: [],
        tags: [],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);

      expect(parsed.prescriptionRequired).toBe(true);
    });

    it('enforces Schedule X → prescriptionRequired=true', () => {
      const bulkRow: BulkProductRow = {
        sku: 'OPIUM-10',
        name: 'Opium Extract',
        manufacturer: 'Reserved',
        category: 'Controlled',
        salts: [{ name: 'Opium', strength: 10, unit: 'ml' }],
        form: 'drops',
        packSize: 100,
        packUnit: 'ml',
        price: 5000,
        gstRate: 12,
        stock: 5,
        scheduleClass: 'X',
        prescriptionRequired: false,
        description: '',
        sideEffects: [],
        contraindications: [],
        tags: [],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);

      expect(parsed.prescriptionRequired).toBe(true);
    });

    it('allows OTC drugs to remain non-prescription', () => {
      const bulkRow: BulkProductRow = {
        sku: 'PARA-500',
        name: 'Paracetamol 500mg',
        manufacturer: 'Bayer',
        category: 'Analgesics',
        salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
        form: 'tablet',
        packSize: 30,
        packUnit: 'tablet',
        price: 100,
        gstRate: 18,
        stock: 100,
        scheduleClass: 'OTC',
        prescriptionRequired: false,
        description: '',
        sideEffects: [],
        contraindications: [],
        tags: [],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);

      expect(parsed.prescriptionRequired).toBe(false);
    });

    it('converts all fields including optionals', () => {
      const bulkRow: BulkProductRow = {
        sku: 'ASPR-500',
        name: 'Aspirin 500mg',
        brand: 'Bayer',
        manufacturer: 'Bayer Pharma',
        category: 'Analgesics',
        salts: [{ name: 'Acetylsalicylic Acid', strength: 500, unit: 'mg' }],
        form: 'tablet',
        packSize: 30,
        packUnit: 'tablet',
        price: 150,
        mrp: 200,
        gstRate: 18,
        stock: 100,
        scheduleClass: 'OTC',
        prescriptionRequired: false,
        hsnCode: '3004905100',
        description: 'Fast relief',
        storageInstructions: 'Store below 25°C',
        usageInstructions: 'Take 1 tablet',
        sideEffects: ['Nausea'],
        contraindications: ['Allergy'],
        tags: ['price-unverified'],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);

      expect(parsed.brand).toBe('Bayer');
      expect(parsed.mrp).toBe(200);
      expect(parsed.hsnCode).toBe('3004905100');
      expect(parsed.storageInstructions).toBe('Store below 25°C');
      expect(parsed.usageInstructions).toBe('Take 1 tablet');
      expect(parsed.sideEffects).toEqual(['Nausea']);
      expect(parsed.contraindications).toEqual(['Allergy']);
      expect(parsed.tags).toEqual(['price-unverified']);
    });
  });

  describe('Integration with Product.save() and pre-validate hook', () => {
    it('creates product via .save() and computes compositionKey/unitPrice', async () => {
      const cat = await Category.create({ name: 'Analgesics', slug: 'analgesics' });

      const bulkRow: BulkProductRow = {
        sku: 'JSON-SAVE-1',
        name: 'Test Product',
        manufacturer: 'Test Pharma',
        category: 'Analgesics',
        salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
        form: 'tablet',
        packSize: 30,
        packUnit: 'tablet',
        price: 150,
        gstRate: 18,
        stock: 100,
        scheduleClass: 'OTC',
        prescriptionRequired: false,
        description: '',
        sideEffects: [],
        contraindications: [],
        tags: [],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);
      const product = new Product({
        sku: parsed.sku,
        name: parsed.name,
        slug: 'test-product',
        manufacturer: parsed.manufacturer,
        category: cat._id,
        salts: parsed.salts,
        form: parsed.form,
        packSize: parsed.packSize,
        packUnit: parsed.packUnit,
        price: parsed.price,
        gstRate: parsed.gstRate,
        stock: parsed.stock,
        scheduleClass: parsed.scheduleClass,
        prescriptionRequired: parsed.prescriptionRequired,
        isActive: parsed.isActive,
        images: [],
      });

      await product.save();

      const saved = await Product.findOne({ sku: 'JSON-SAVE-1' }).lean<any>();
      expect(saved).toBeDefined();
      if (saved) {
        expect(saved.compositionKey).toBeDefined();
        expect(typeof saved.compositionKey).toBe('string');
        expect(saved.unitPrice).toBe(5); // 150 / 30
      }
    });

    it('Schedule H enforcement persists through save()', async () => {
      const cat = await Category.create({ name: 'Cardiac', slug: 'cardiac' });

      const bulkRow: BulkProductRow = {
        sku: 'ATENOL-50',
        name: 'Atenolol 50mg',
        manufacturer: 'Cipla',
        category: 'Cardiac',
        salts: [{ name: 'Atenolol', strength: 50, unit: 'mg' }],
        form: 'tablet',
        packSize: 30,
        packUnit: 'tablet',
        price: 120,
        gstRate: 5,
        stock: 80,
        scheduleClass: 'H',
        prescriptionRequired: false, // Input says false
        description: '',
        sideEffects: [],
        contraindications: [],
        tags: [],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);

      const product = new Product({
        sku: parsed.sku,
        name: parsed.name,
        slug: 'atenolol-50mg',
        manufacturer: parsed.manufacturer,
        category: cat._id,
        salts: parsed.salts,
        form: parsed.form,
        packSize: parsed.packSize,
        packUnit: parsed.packUnit,
        price: parsed.price,
        gstRate: parsed.gstRate,
        stock: parsed.stock,
        scheduleClass: parsed.scheduleClass,
        prescriptionRequired: parsed.prescriptionRequired, // Should be true from conversion
        isActive: parsed.isActive,
        images: [],
      });

      await product.save();

      const saved = await Product.findOne({ sku: 'ATENOL-50' }).lean<any>();
      expect(saved).toBeDefined();
      if (saved) {
        expect(saved.prescriptionRequired).toBe(true);
        expect(saved.scheduleClass).toBe('H');
      }
    });
  });

  describe('Edge cases', () => {
    it('handles multiple salts', () => {
      const bulkRow: BulkProductRow = {
        sku: 'COMB-001',
        name: 'Co-amoxiclav 625mg',
        manufacturer: 'GSK',
        category: 'Antibiotics',
        salts: [
          { name: 'Amoxicillin', strength: 500, unit: 'mg' },
          { name: 'Clavulanic Acid', strength: 125, unit: 'mg' },
        ],
        form: 'tablet',
        packSize: 21,
        packUnit: 'tablet',
        price: 450,
        gstRate: 12,
        stock: 50,
        scheduleClass: 'H',
        prescriptionRequired: false,
        description: '',
        sideEffects: [],
        contraindications: [],
        tags: [],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);

      expect(parsed.salts).toHaveLength(2);
      expect(parsed.prescriptionRequired).toBe(true); // Forced by H
    });

    it('handles minimal required fields only', () => {
      const bulkRow: BulkProductRow = {
        sku: 'MIN-001',
        name: 'Minimal',
        manufacturer: 'Test',
        category: 'Test',
        salts: [{ name: 'Salt', strength: 100, unit: 'mg' }],
        form: 'tablet',
        packSize: 10,
        packUnit: 'tablet',
        price: 50,
        gstRate: 5,
        stock: 0,
        scheduleClass: 'OTC',
        prescriptionRequired: false,
        description: '',
        sideEffects: [],
        contraindications: [],
        tags: [],
        isActive: true,
      };

      const parsed = bulkRowToParsedProductRow(bulkRow);

      expect(parsed.brand).toBeUndefined();
      expect(parsed.mrp).toBeUndefined();
      expect(parsed.hsnCode).toBeUndefined();
      expect(parsed.gstRate).toBe(5);
      expect(parsed.stock).toBe(0);
    });
  });
});
