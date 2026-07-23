import { describe, it, expect } from 'vitest';
import { buildStrip, type StripProductInput } from './strip';

const salts = [{ name: 'Paracetamol', strength: 650, unit: 'mg' as const }];

function product(over: Partial<StripProductInput>): StripProductInput {
  return {
    _id: 'x',
    name: 'X',
    slug: 'x',
    manufacturer: 'Maker',
    price: 30,
    packSize: 15,
    packUnit: 'tablet',
    unitPrice: 2,
    stock: 10,
    averageRating: 0,
    totalReviews: 0,
    salts,
    form: 'tablet',
    ...over,
  };
}

describe('buildStrip', () => {
  const products = [
    product({ _id: 'dolo', name: 'Dolo 650', slug: 'dolo-650', unitPrice: 2.03, stock: 120 }),
    product({ _id: 'calpol', name: 'Calpol 650', slug: 'calpol-650', unitPrice: 1.46, stock: 84 }),
    product({ _id: 'sumo', name: 'Sumo 650', slug: 'sumo-650', unitPrice: 1.58, stock: 0 }),
  ];

  it('labels the composition and form from the current product', () => {
    const strip = buildStrip(products, 'dolo');
    expect(strip.composition).toBe('Paracetamol 650 mg');
    expect(strip.form).toBe('tablet');
  });

  it('sorts in-stock alternatives by unit price ascending', () => {
    const strip = buildStrip(products, 'dolo');
    const inStock = strip.alternatives.filter((a) => a.stock > 0).map((a) => a.slug);
    expect(inStock).toEqual(['calpol-650', 'dolo-650']);
  });

  it('keeps out-of-stock alternatives visible but sorted last, even if cheaper', () => {
    const strip = buildStrip(products, 'dolo');
    const last = strip.alternatives[strip.alternatives.length - 1];
    expect(last.slug).toBe('sumo-650'); // ₹1.58 but out of stock → last
    expect(last.stock).toBe(0);
  });

  it('marks the cheapest in-stock brand and the current product', () => {
    const strip = buildStrip(products, 'dolo');
    const calpol = strip.alternatives.find((a) => a.slug === 'calpol-650')!;
    const dolo = strip.alternatives.find((a) => a.slug === 'dolo-650')!;
    expect(calpol.badges).toContain('cheapest');
    expect(dolo.badges).toContain('current');
  });

  it('exposes unitPrice as the headline number on every alternative', () => {
    const strip = buildStrip(products, 'dolo');
    for (const a of strip.alternatives) expect(typeof a.unitPrice).toBe('number');
  });

  it('normalizes ObjectId-like _id values to strings', () => {
    const strip = buildStrip(
      [product({ _id: { toString: () => 'abc' }, slug: 'a' })],
      'abc'
    );
    expect(strip.alternatives[0]._id).toBe('abc');
  });

  it('returns an empty strip for no products', () => {
    expect(buildStrip([], 'x').alternatives).toEqual([]);
  });
});
