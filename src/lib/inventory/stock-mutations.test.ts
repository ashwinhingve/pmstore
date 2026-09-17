import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '@/models/Product';
import StockBatch from '@/models/StockBatch';
import Purchase from '@/models/Purchase';
import PurchaseReturn from '@/models/PurchaseReturn';
import InventoryAdjustment from '@/models/InventoryAdjustment';
import InventoryHistory from '@/models/InventoryHistory';
import {
  receivePurchase,
  drawDownBatchesFEFO,
  refreshProductExpiry,
  applyAdjustment,
  applyPurchaseReturn,
  recordSaleMovement,
} from './stock-mutations';

/**
 * The inventory service against a real MongoDB — the bugs live in the query,
 * the FEFO ordering and the Product/batch/ledger consistency, so these run
 * against mongodb-memory-server, not mocks (docs/07-TESTING.md).
 */

let mongo: MongoMemoryServer;
let seq = 0;

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

async function makeProduct(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return Product.create({
    name: `Test Med ${seq}`,
    slug: `test-med-${seq}`,
    sku: `PMS-TST-${seq}`,
    category: new mongoose.Types.ObjectId(),
    price: 30,
    stock: 0,
    salts: [{ name: 'Paracetamol', strength: 500, unit: 'mg' }],
    form: 'tablet',
    manufacturer: 'Test Labs',
    packSize: 10,
    packUnit: 'tablet',
    ...overrides,
  });
}

const D = (s: string) => new Date(s);

describe('receivePurchase', () => {
  it('creates a batch, raises Product.stock, logs history and sets earliest expiry', async () => {
    const product = await makeProduct();
    const purchase = await Purchase.create({
      purchaseNumber: 'PUR-1',
      supplierId: new mongoose.Types.ObjectId(),
      supplierName: 'Medico Agencies',
      status: 'draft',
      items: [
        {
          productId: product._id,
          productName: product.name,
          batchNumber: 'B100',
          expiryDate: D('2027-05-01'),
          quantity: 40,
          freeQuantity: 10,
          costPrice: 8,
          mrp: 15,
          lineTotal: 320,
        },
      ],
    });

    await receivePurchase(purchase);

    const batch = await StockBatch.findOne({ productId: product._id });
    expect(batch?.quantityReceived).toBe(50); // 40 + 10 free
    expect(batch?.quantityRemaining).toBe(50);

    const after = await Product.findById(product._id);
    expect(after?.stock).toBe(50);
    expect(after?.expiryDate?.toISOString().slice(0, 10)).toBe('2027-05-01');

    const history = await InventoryHistory.find({ productId: product._id, type: 'purchase' });
    expect(history).toHaveLength(1);
    expect(history[0].quantityDelta).toBe(50);
    expect(history[0].balanceAfter).toBe(50);
    expect(history[0].refLabel).toBe('PUR-1');
  });
});

describe('drawDownBatchesFEFO', () => {
  it('takes from the earliest-expiring batch first, rolling into the next', async () => {
    const product = await makeProduct({ stock: 15 });
    await StockBatch.create({
      productId: product._id, batchNumber: 'LATE', expiryDate: D('2028-01-01'),
      costPrice: 8, quantityReceived: 10, quantityRemaining: 10, receivedAt: D('2026-02-01'),
    });
    await StockBatch.create({
      productId: product._id, batchNumber: 'EARLY', expiryDate: D('2027-01-01'),
      costPrice: 8, quantityReceived: 5, quantityRemaining: 5, receivedAt: D('2026-01-01'),
    });

    const { allocations, shortfall } = await drawDownBatchesFEFO(product._id, 7);

    expect(shortfall).toBe(0);
    expect(allocations.map((a) => [a.batchNumber, a.taken])).toEqual([
      ['EARLY', 5],
      ['LATE', 2],
    ]);

    const early = await StockBatch.findOne({ productId: product._id, batchNumber: 'EARLY' });
    const late = await StockBatch.findOne({ productId: product._id, batchNumber: 'LATE' });
    expect(early?.quantityRemaining).toBe(0);
    expect(early?.isDepleted).toBe(true);
    expect(late?.quantityRemaining).toBe(8);
  });

  it('consumes dated batches before a no-expiry batch (null expiry sorts last)', async () => {
    const product = await makeProduct({ stock: 10 });
    // No-expiry lot received EARLIER — an ascending Mongo sort would wrongly take
    // it first; FEFO must take the dated lot first.
    await StockBatch.create({
      productId: product._id, batchNumber: 'NOEXP', costPrice: 8,
      quantityReceived: 5, quantityRemaining: 5, receivedAt: D('2026-01-01'),
    });
    await StockBatch.create({
      productId: product._id, batchNumber: 'DATED', expiryDate: D('2027-06-01'),
      costPrice: 8, quantityReceived: 5, quantityRemaining: 5, receivedAt: D('2026-02-01'),
    });

    const { allocations, shortfall } = await drawDownBatchesFEFO(product._id, 6);

    expect(shortfall).toBe(0);
    expect(allocations.map((a) => [a.batchNumber, a.taken])).toEqual([
      ['DATED', 5],
      ['NOEXP', 1],
    ]);
  });

  it('reports a shortfall when batches cannot cover the quantity', async () => {
    const product = await makeProduct();
    await StockBatch.create({
      productId: product._id, batchNumber: 'ONLY', expiryDate: D('2027-01-01'),
      costPrice: 8, quantityReceived: 3, quantityRemaining: 3,
    });
    const { shortfall } = await drawDownBatchesFEFO(product._id, 10);
    expect(shortfall).toBe(7);
  });
});

describe('refreshProductExpiry', () => {
  it('re-points expiry at the earliest live batch and unsets it when none remain', async () => {
    const product = await makeProduct({ expiryDate: D('2027-01-01') });
    await StockBatch.create({
      productId: product._id, batchNumber: 'A', expiryDate: D('2027-01-01'),
      costPrice: 8, quantityReceived: 5, quantityRemaining: 0, isDepleted: true,
    });
    await StockBatch.create({
      productId: product._id, batchNumber: 'B', expiryDate: D('2028-06-01'),
      costPrice: 8, quantityReceived: 5, quantityRemaining: 5,
    });

    await refreshProductExpiry(product._id);
    let after = await Product.findById(product._id);
    expect(after?.expiryDate?.toISOString().slice(0, 10)).toBe('2028-06-01');

    await StockBatch.updateMany({ productId: product._id }, { quantityRemaining: 0 });
    await refreshProductExpiry(product._id);
    after = await Product.findById(product._id);
    expect(after?.expiryDate).toBeUndefined();
  });
});

describe('applyAdjustment', () => {
  it('in/opening seeds a batch, raises stock and logs an opening row', async () => {
    const product = await makeProduct();
    const adj = await InventoryAdjustment.create({
      productId: product._id, productName: product.name, direction: 'in',
      quantity: 20, reason: 'opening', batchNumber: 'OPEN1',
      expiryDate: D('2027-09-01'), costPrice: 7,
    });

    await applyAdjustment(adj);

    const after = await Product.findById(product._id);
    expect(after?.stock).toBe(20);
    const batch = await StockBatch.findOne({ productId: product._id, batchNumber: 'OPEN1' });
    expect(batch?.quantityRemaining).toBe(20);
    const history = await InventoryHistory.find({ productId: product._id });
    expect(history[0].type).toBe('opening');
    expect(history[0].quantityDelta).toBe(20);
  });

  it('out/counter_sale lowers stock, draws FEFO and logs an adjustment row', async () => {
    const product = await makeProduct({ stock: 12 });
    await StockBatch.create({
      productId: product._id, batchNumber: 'S1', expiryDate: D('2027-01-01'),
      costPrice: 8, quantityReceived: 12, quantityRemaining: 12,
    });
    const adj = await InventoryAdjustment.create({
      productId: product._id, productName: product.name, direction: 'out',
      quantity: 5, reason: 'counter_sale',
    });

    await applyAdjustment(adj);

    const after = await Product.findById(product._id);
    expect(after?.stock).toBe(7);
    const batch = await StockBatch.findOne({ productId: product._id, batchNumber: 'S1' });
    expect(batch?.quantityRemaining).toBe(7);
    const history = await InventoryHistory.findOne({ productId: product._id, type: 'adjustment' });
    expect(history?.quantityDelta).toBe(-5);
    expect(history?.reason).toBe('counter_sale');
  });

  it('out with a target batchId draws that batch, not the FEFO earliest', async () => {
    const product = await makeProduct({ stock: 10 });
    const early = await StockBatch.create({
      productId: product._id, batchNumber: 'EARLY', expiryDate: D('2027-01-01'),
      costPrice: 8, quantityReceived: 5, quantityRemaining: 5,
    });
    const late = await StockBatch.create({
      productId: product._id, batchNumber: 'LATE', expiryDate: D('2028-01-01'),
      costPrice: 8, quantityReceived: 5, quantityRemaining: 5,
    });
    const adj = await InventoryAdjustment.create({
      productId: product._id, productName: product.name, direction: 'out',
      quantity: 3, reason: 'expiry_writeoff', batchId: late._id,
    });

    await applyAdjustment(adj);

    const e = await StockBatch.findById(early._id);
    const l = await StockBatch.findById(late._id);
    expect(e?.quantityRemaining).toBe(5); // untouched
    expect(l?.quantityRemaining).toBe(2); // 5 - 3
    expect((await Product.findById(product._id))?.stock).toBe(7);
  });

  it('out throws INSUFFICIENT_STOCK without touching stock when short', async () => {
    const product = await makeProduct({ stock: 2 });
    const adj = await InventoryAdjustment.create({
      productId: product._id, productName: product.name, direction: 'out',
      quantity: 5, reason: 'wastage',
    });
    await expect(applyAdjustment(adj)).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    const after = await Product.findById(product._id);
    expect(after?.stock).toBe(2);
  });
});

describe('applyPurchaseReturn', () => {
  it('lowers stock and the batch, and logs a purchase_return row', async () => {
    const product = await makeProduct({ stock: 10 });
    const batch = await StockBatch.create({
      productId: product._id, batchNumber: 'R1', expiryDate: D('2027-01-01'),
      costPrice: 8, quantityReceived: 10, quantityRemaining: 10,
    });
    const ret = await PurchaseReturn.create({
      returnNumber: 'PRET-1',
      supplierId: new mongoose.Types.ObjectId(),
      supplierName: 'Medico Agencies',
      items: [
        {
          productId: product._id, productName: product.name, batchId: batch._id,
          batchNumber: 'R1', quantity: 4, costPrice: 8, reason: 'damaged', lineTotal: 32,
        },
      ],
    });

    await applyPurchaseReturn(ret);

    const after = await Product.findById(product._id);
    expect(after?.stock).toBe(6);
    const b = await StockBatch.findById(batch._id);
    expect(b?.quantityRemaining).toBe(6);
    const history = await InventoryHistory.findOne({ productId: product._id, type: 'purchase_return' });
    expect(history?.quantityDelta).toBe(-4);
    expect(history?.refLabel).toBe('PRET-1');
  });

  it('rejects the whole return when stock cannot cover it', async () => {
    const product = await makeProduct({ stock: 2 });
    const ret = await PurchaseReturn.create({
      returnNumber: 'PRET-2',
      supplierId: new mongoose.Types.ObjectId(),
      supplierName: 'X',
      items: [
        { productId: product._id, productName: product.name, quantity: 5, costPrice: 8, reason: 'expired', lineTotal: 40 },
      ],
    });
    await expect(applyPurchaseReturn(ret)).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    const after = await Product.findById(product._id);
    expect(after?.stock).toBe(2);
  });
});

describe('recordSaleMovement', () => {
  it('draws batches down FEFO and logs a sale row (Product.stock left to the caller)', async () => {
    const product = await makeProduct({ stock: 10 }); // pre-decremented by the payment path
    await StockBatch.create({
      productId: product._id, batchNumber: 'SALE1', expiryDate: D('2027-01-01'),
      costPrice: 8, quantityReceived: 10, quantityRemaining: 10,
    });

    await recordSaleMovement(
      [{ productId: product._id, productName: product.name, quantity: 3 }],
      { orderId: new mongoose.Types.ObjectId(), orderNumber: 'PM-ORD-1' }
    );

    const batch = await StockBatch.findOne({ productId: product._id });
    expect(batch?.quantityRemaining).toBe(7);
    const history = await InventoryHistory.findOne({ productId: product._id, type: 'sale' });
    expect(history?.quantityDelta).toBe(-3);
    expect(history?.refLabel).toBe('PM-ORD-1');
  });

  it('still logs a sale for a legacy product with no batches, and never throws', async () => {
    const product = await makeProduct({ stock: 5 });
    await expect(
      recordSaleMovement([{ productId: product._id, quantity: 2 }], { orderNumber: 'PM-ORD-2' })
    ).resolves.toBeUndefined();
    const history = await InventoryHistory.findOne({ productId: product._id, type: 'sale' });
    expect(history?.quantityDelta).toBe(-2);
    expect(history?.batchId).toBeFalsy();
  });
});
