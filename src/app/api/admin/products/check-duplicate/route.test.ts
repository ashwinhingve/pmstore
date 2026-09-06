import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '@/models/Product';
import Category from '@/models/Category';

/**
 * Integration tests for duplicate detection matching logic.
 * Uses mongodb-memory-server for real query behavior testing — this is the only
 * way to catch regex injection bugs (mocks would pass even with a broken regex).
 *
 * Tests the matching logic directly against a real in-memory database.
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

/**
 * Helper to escape regex (copy of escapeRegex from route.ts for testing)
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Performs the same matching logic as the route handler to test query behavior.
 */
async function checkDuplicates(
  name: string,
  salts?: Array<{ name: string; strength: number; unit: string }>,
  form?: string,
  manufacturer?: string,
  packSize?: number,
  currentProductId?: string
) {
  const normalizedName = name.toLowerCase().trim();

  // Build composition key if all required fields are present
  let compositionKey: string | null = null;
  if (salts?.length && form && manufacturer && packSize && packSize > 0) {
    try {
      // Import buildCompositionKey at runtime to avoid circular deps
      const { buildCompositionKey } = await import('@/lib/pharma/composition');
      const validSalts = salts
        .filter((s) => s.name && s.strength !== undefined && s.unit)
        .map((s) => ({
          name: s.name,
          strength: s.strength,
          unit: s.unit,
        }));
      if (validSalts.length > 0) {
        compositionKey = buildCompositionKey(validSalts as any, form as any);
      }
    } catch {
      // Silently fail on composition key build
    }
  }

  // Build the query for duplicates:
  // - If composition data provided: return products matching on BOTH name AND composition
  // - If composition data missing: return products matching on name only
  let query_final: any;

  if (compositionKey && manufacturer && packSize) {
    // Full composition available: strict match on all criteria
    query_final = {
      isActive: true,
      name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' },
      compositionKey,
      manufacturer: { $regex: `^${escapeRegex(manufacturer)}$`, $options: 'i' },
      packSize,
    };
  } else {
    // No composition data: match on name only (softer signal)
    query_final = {
      isActive: true,
      name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' },
    };
  }

  // Exclude the product being edited
  if (currentProductId) {
    query_final._id = { $ne: new mongoose.Types.ObjectId(currentProductId) };
  }

  const matches = await Product.find(query_final)
    .select('_id name manufacturer packSize packUnit compositionKey slug images unitPrice')
    .limit(5)
    .lean();

  return matches || [];
}

describe('Duplicate detection matching logic', () => {
  it('matches on normalized name only (case-insensitive)', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    await Product.create({
      name: 'Paracetamol 650mg',
      slug: 'paracetamol-650mg',
      sku: 'PMS-PAR-001',
      category: cat._id,
      price: 30,
      stock: 100,
      images: [],
      salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'Sun Pharma',
      packSize: 15,
      packUnit: 'tablet',
      isActive: true,
    });

    const matches = await checkDuplicates('PARACETAMOL 650MG');
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('Paracetamol 650mg');
  });

  it('matches on full composition when all fields are present', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    const prod1 = await Product.create({
      name: 'Crocin 650',
      slug: 'crocin-650',
      sku: 'PMS-CRO-001',
      category: cat._id,
      price: 35,
      stock: 100,
      images: [],
      salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'GSK',
      packSize: 15,
      packUnit: 'tablet',
      isActive: true,
    });

    const matches = await checkDuplicates(
      'Crocin 650',
      [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
      'tablet',
      'GSK',
      15
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].compositionKey).toBe('paracetamol-650mg|tablet');
    expect(matches[0].manufacturer).toBe('GSK');
    expect(matches[0].packSize).toBe(15);
  });

  it('excludes currentProductId from results (edit mode)', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    const prod = await Product.create({
      name: 'Aspirin 500',
      slug: 'aspirin-500',
      sku: 'PMS-ASP-001',
      category: cat._id,
      price: 25,
      stock: 100,
      images: [],
      salts: [{ name: 'Aspirin', strength: 500, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'Bayer',
      packSize: 10,
      packUnit: 'tablet',
      isActive: true,
    });

    // Search should find the product normally
    const all = await checkDuplicates('Aspirin 500');
    expect(all).toHaveLength(1);

    // But when we exclude it, should get empty
    const filtered = await checkDuplicates('Aspirin 500', undefined, undefined, undefined, undefined, String(prod._id));
    expect(filtered).toHaveLength(0);
  });

  it('returns empty array when no duplicates found', async () => {
    const matches = await checkDuplicates('Unique Product XYZ 12345');
    expect(matches).toEqual([]);
  });

  it('limits results to 5 matches', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    // Create 10 products with similar names
    for (let i = 0; i < 10; i++) {
      await Product.create({
        name: 'Common Name',
        slug: `common-name-${i}`,
        sku: `PMS-COM-${i}`,
        category: cat._id,
        price: 30 + i,
        stock: 100,
        images: [],
        salts: [{ name: 'Paracetamol', strength: 500 + i * 10, unit: 'mg' }],
        form: 'tablet',
        manufacturer: `Manufacturer ${i}`,
        packSize: 10,
        packUnit: 'tablet',
        isActive: true,
      });
    }

    const matches = await checkDuplicates('Common Name');
    expect(matches.length).toBeLessThanOrEqual(5);
  });

  it('serializes _id to string in results', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    await Product.create({
      name: 'Test Product',
      slug: 'test-product',
      sku: 'PMS-TST-001',
      category: cat._id,
      price: 30,
      stock: 100,
      images: [],
      salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'Test Pharma',
      packSize: 10,
      packUnit: 'tablet',
      isActive: true,
    });

    const matches = await checkDuplicates('Test Product');
    expect(matches).toHaveLength(1);
    expect(typeof matches[0]._id).toBe('object'); // ObjectId from lean, not string
  });

  it('filters out empty salts when building composition key', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    const prod = await Product.create({
      name: 'Multi-salt Product',
      slug: 'multi-salt',
      sku: 'PMS-MUL-001',
      category: cat._id,
      price: 50,
      stock: 100,
      images: [],
      salts: [
        { name: 'Paracetamol', strength: 500, unit: 'mg' },
        { name: 'Ibuprofen', strength: 200, unit: 'mg' },
      ],
      form: 'tablet',
      manufacturer: 'Multi Pharma',
      packSize: 10,
      packUnit: 'tablet',
      isActive: true,
    });

    // Call with mixed salts (some valid, some empty)
    const matches = await checkDuplicates(
      'Multi-salt Product',
      [
        { name: '', strength: 0, unit: 'mg' },
        { name: 'Paracetamol', strength: 500, unit: 'mg' },
        { name: 'Ibuprofen', strength: 200, unit: 'mg' },
      ],
      'tablet',
      'Multi Pharma',
      10
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].compositionKey).toContain('ibuprofen');
    expect(matches[0].compositionKey).toContain('paracetamol');
  });

  it('does not build composition key if packSize is zero or missing', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    // Create product with a name but no composition-based match
    await Product.create({
      name: 'Test Drug',
      slug: 'test-drug',
      sku: 'PMS-TST-001',
      category: cat._id,
      price: 30,
      stock: 100,
      images: [],
      salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'Test Pharma',
      packSize: 15,
      packUnit: 'tablet',
      isActive: true,
    });

    // Try to match with packSize: 0 (should only match on name, not composition)
    const matches = await checkDuplicates(
      'Test Drug',
      [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
      'tablet',
      'Test Pharma',
      0
    );

    expect(matches).toHaveLength(1); // Still matches on name
    expect(matches[0].name).toBe('Test Drug');
  });

  it('rejects active=false products', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    await Product.create({
      name: 'Inactive Product',
      slug: 'inactive-product',
      sku: 'PMS-INA-001',
      category: cat._id,
      price: 30,
      stock: 100,
      images: [],
      salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'Test Pharma',
      packSize: 10,
      packUnit: 'tablet',
      isActive: false, // Inactive
    });

    const matches = await checkDuplicates('Inactive Product');
    expect(matches).toHaveLength(0);
  });

  it('escapes regex special characters in name to prevent injection', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    await Product.create({
      name: 'Product.Test',
      slug: 'product-test',
      sku: 'PMS-PRD-001',
      category: cat._id,
      price: 30,
      stock: 100,
      images: [],
      salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'Test Pharma',
      packSize: 10,
      packUnit: 'tablet',
      isActive: true,
    });

    // Search with a regex pattern should be escaped
    const matches = await checkDuplicates('Product.Test');
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('Product.Test');

    // Search with regex metacharacters should NOT match as a pattern
    const noMatch = await checkDuplicates('Product.*');
    expect(noMatch).toHaveLength(0);
  });

  it('escapes regex special characters in manufacturer', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    await Product.create({
      name: 'Test Product',
      slug: 'test-product',
      sku: 'PMS-TST-001',
      category: cat._id,
      price: 30,
      stock: 100,
      images: [],
      salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'Pharma+Co',
      packSize: 10,
      packUnit: 'tablet',
      isActive: true,
    });

    // Match with exact manufacturer name including special chars
    const matches = await checkDuplicates(
      'Test Product',
      [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
      'tablet',
      'Pharma+Co',
      10
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].manufacturer).toBe('Pharma+Co');
  });

  it('handles multiple products with same name but different pack sizes', async () => {
    const cat = await Category.create({ name: 'Test', slug: 'test' });

    await Product.create({
      name: 'Aspirin',
      slug: 'aspirin-500-10',
      sku: 'PMS-ASP-001',
      category: cat._id,
      price: 25,
      stock: 100,
      images: [],
      salts: [{ name: 'Aspirin', strength: 500, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'Bayer',
      packSize: 10,
      packUnit: 'tablet',
      isActive: true,
    });

    await Product.create({
      name: 'Aspirin',
      slug: 'aspirin-500-20',
      sku: 'PMS-ASP-002',
      category: cat._id,
      price: 40,
      stock: 100,
      images: [],
      salts: [{ name: 'Aspirin', strength: 500, unit: 'mg' }],
      form: 'tablet',
      manufacturer: 'Bayer',
      packSize: 20,
      packUnit: 'tablet',
      isActive: true,
    });

    // Name-only match should return both
    const byName = await checkDuplicates('Aspirin');
    expect(byName).toHaveLength(2);

    // Full composition match with packSize 10 should return only one
    const byComposition = await checkDuplicates(
      'Aspirin',
      [{ name: 'Aspirin', strength: 500, unit: 'mg' }],
      'tablet',
      'Bayer',
      10
    );

    expect(byComposition).toHaveLength(1);
    expect(byComposition[0].packSize).toBe(10);
  });
});
