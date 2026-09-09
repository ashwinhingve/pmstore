import { describe, it, expect } from 'vitest';
import { buildCompareViewModel, buildMultiCompare, type CompareProduct } from './compare';

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

describe('buildMultiCompare', () => {
  const pricier = product({ _id: 'p3', name: 'Pricey 650', unitPrice: 2.5, price: 37.5 });

  it('ranks cheapest-per-unit first and flags it as the best value', () => {
    const vm = buildMultiCompare([dolo, calpol, pricier]);
    expect(vm.searchedId).toBe('p1'); // first id = the searched brand
    expect(vm.cheapestId).toBe('p2'); // Calpol, cheapest per tablet
    expect(vm.ranked[0]._id).toBe('p2');
    expect(vm.ranked.map((r) => r._id)).toEqual(['p2', 'p1', 'p3']);
  });

  it('reports the cheapest brand’s savings against the searched brand', () => {
    const vm = buildMultiCompare([dolo, calpol, pricier]);
    const cheapest = vm.ranked.find((r) => r._id === vm.cheapestId);
    expect(cheapest?.savings).toEqual({ perUnit: 0.57, perPack: 8.55, percent: 28 });
  });

  it('labels the shared composition when every brand matches', () => {
    const vm = buildMultiCompare([dolo, calpol, pricier]);
    expect(vm.sameComposition).toBe(true);
    expect(vm.compositionLabel).toBe('Paracetamol 650 mg');
  });

  it('names the searched brand the best value when it is already the cheapest', () => {
    const cheapDolo = product({ unitPrice: 1.0, price: 15 });
    const vm = buildMultiCompare([cheapDolo, calpol, pricier]);
    expect(vm.cheapestId).toBe('p1');
  });

  it('never names an out-of-stock brand the best value, even when cheaper', () => {
    const cheaperGone = product({ _id: 'p2', unitPrice: 0.5, stock: 0 });
    const vm = buildMultiCompare([dolo, cheaperGone, pricier]);
    expect(vm.cheapestId).toBe('p1'); // cheapest of the in-stock pool
  });

  it('flags mixed compositions and drops the label', () => {
    const ibu = product({
      _id: 'p3',
      name: 'Ibugesic 400',
      unitPrice: 1.2,
      price: 12,
      packSize: 10,
      compositionKey: 'ibuprofen-400mg|tablet',
      salts: [{ name: 'Ibuprofen', strength: 400, unit: 'mg' }],
    });
    const vm = buildMultiCompare([dolo, calpol, ibu]);
    expect(vm.sameComposition).toBe(false);
    expect(vm.compositionLabel).toBeNull();
  });

  it('requires at least two products', () => {
    expect(() => buildMultiCompare([dolo])).toThrow();
  });
});
