import { describe, it, expect } from 'vitest';
import { buildCompareViewModel, type CompareProduct } from './compare';

function product(overrides: Partial<CompareProduct>): CompareProduct {
  return {
    _id: 'p1',
    name: 'Dolo 650',
    slug: 'dolo-650',
    manufacturer: 'Micro Labs',
    price: 30.5,
    packSize: 15,
    packUnit: 'tablet',
    unitPrice: 2.03,
    stock: 40,
    compositionKey: 'paracetamol-650mg|tablet',
    salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
    form: 'tablet',
    ...overrides,
  };
}

const dolo = product({});
const calpol = product({
  _id: 'p2',
  name: 'Calpol 650',
  slug: 'calpol-650',
  manufacturer: 'GSK',
  price: 21.9,
  unitPrice: 1.46,
});

describe('buildCompareViewModel', () => {
  it('picks the lower unit price as best and computes savings vs the other', () => {
    const vm = buildCompareViewModel([dolo, calpol]);
    expect(vm.verdict?.bestId).toBe('p2');
    expect(vm.verdict?.savings).toEqual({ perUnit: 0.57, perPack: 8.55, percent: 28 });
  });

  it('flags same composition and formats the label', () => {
    const vm = buildCompareViewModel([dolo, calpol]);
    expect(vm.sameComposition).toBe(true);
    expect(vm.compositionLabel).toBe('Paracetamol 650 mg');
  });

  it('still compares prices across different compositions, without a label', () => {
    const ibugesic = product({
      _id: 'p3',
      name: 'Ibugesic 400',
      unitPrice: 1.2,
      price: 12,
      packSize: 10,
      compositionKey: 'ibuprofen-400mg|tablet',
      salts: [{ name: 'Ibuprofen', strength: 400, unit: 'mg' }],
    });
    const vm = buildCompareViewModel([dolo, ibugesic]);
    expect(vm.sameComposition).toBe(false);
    expect(vm.compositionLabel).toBeNull();
    expect(vm.verdict?.bestId).toBe('p3');
  });

  it('never names an out-of-stock product best, even when it is cheaper', () => {
    const cheaperButGone = product({ _id: 'p2', unitPrice: 1.1, stock: 0 });
    const vm = buildCompareViewModel([dolo, cheaperButGone]);
    expect(vm.verdict?.bestId).toBe('p1');
    // The in-stock winner is more expensive, so there is nothing to save.
    expect(vm.verdict?.savings).toBeNull();
  });

  it('returns no verdict when both products are out of stock', () => {
    const vm = buildCompareViewModel([
      product({ stock: 0 }),
      product({ _id: 'p2', unitPrice: 1.46, stock: 0 }),
    ]);
    expect(vm.verdict).toBeNull();
  });

  it('breaks a unit-price tie on the cheaper pack', () => {
    const smallPack = product({ _id: 'p2', price: 20.3, packSize: 10, unitPrice: 2.03 });
    const vm = buildCompareViewModel([dolo, smallPack]);
    expect(vm.verdict?.bestId).toBe('p2');
    expect(vm.verdict?.savings).toBeNull();
  });

  it('returns no verdict when unit price and pack price are identical', () => {
    const twin = product({ _id: 'p2', name: 'Paracip 650' });
    const vm = buildCompareViewModel([dolo, twin]);
    expect(vm.verdict).toBeNull();
  });

  it('requires exactly two products', () => {
    expect(() => buildCompareViewModel([dolo])).toThrow();
    expect(() => buildCompareViewModel([dolo, calpol, calpol])).toThrow();
  });

  it('keeps the given product order in the view model', () => {
    const vm = buildCompareViewModel([calpol, dolo]);
    expect(vm.products.map((p) => p._id)).toEqual(['p2', 'p1']);
  });
});
