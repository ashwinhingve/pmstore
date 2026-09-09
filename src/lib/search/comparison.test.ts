import { describe, it, expect } from 'vitest';
import {
  groupComparableProducts,
  pickComparisonPair,
  isExactNameMatch,
  scopeToComposition,
  type ComparableProduct,
} from './comparison';

interface P extends ComparableProduct {
  id: string;
}

const p = (id: string, compositionKey: string, rank: number, unitPrice = 1, stock = 10): P => ({
  id,
  compositionKey,
  rank,
  unitPrice,
  stock,
});

describe('groupComparableProducts', () => {
  it('drops groups with only one brand — nothing to compare against', () => {
    const products = [p('a', 'paracetamol-650-tablet', 0)];
    expect(groupComparableProducts(products)).toEqual([]);
  });

  it('keeps groups with two or more brands sharing a compositionKey', () => {
    const products = [
      p('a', 'paracetamol-650-tablet', 0),
      p('b', 'paracetamol-650-tablet', 1),
    ];
    const groups = groupComparableProducts(products);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('never mixes different compositions into one group', () => {
    const products = [
      p('a', 'paracetamol-650-tablet', 0),
      p('b', 'paracetamol-650-tablet', 1),
      p('c', 'ibuprofen-400-tablet', 2),
      p('d', 'ibuprofen-400-tablet', 3),
    ];
    const groups = groupComparableProducts(products);
    expect(groups).toHaveLength(2);
    const keys = groups.map((g) => g[0].compositionKey).sort();
    expect(keys).toEqual(['ibuprofen-400-tablet', 'paracetamol-650-tablet']);
  });

  it('orders groups by their most relevant (lowest-rank) member first', () => {
    const products = [
      p('a', 'ibuprofen-400-tablet', 5),
      p('b', 'ibuprofen-400-tablet', 6),
      p('c', 'paracetamol-650-tablet', 0),
      p('d', 'paracetamol-650-tablet', 1),
    ];
    const groups = groupComparableProducts(products);
    expect(groups[0][0].compositionKey).toBe('paracetamol-650-tablet');
    expect(groups[1][0].compositionKey).toBe('ibuprofen-400-tablet');
  });

  it('caps the number of groups returned', () => {
    const products = [
      p('a1', 'k1', 0), p('a2', 'k1', 1),
      p('b1', 'k2', 2), p('b2', 'k2', 3),
      p('c1', 'k3', 4), p('c2', 'k3', 5),
      p('d1', 'k4', 6), p('d2', 'k4', 7),
    ];
    expect(groupComparableProducts(products, 3)).toHaveLength(3);
  });
});

describe('pickComparisonPair', () => {
  it('puts the most relevant (lowest-rank) result on the left as "searched"', () => {
    const group = [p('a', 'k', 3), p('b', 'k', 0), p('c', 'k', 5)];
    const { searched } = pickComparisonPair(group);
    expect(searched.id).toBe('b');
  });

  it('picks the cheapest in-stock brand as the alternative', () => {
    const group = [
      p('searched', 'k', 0, 10, 10),
      p('pricier', 'k', 1, 15, 10),
      p('cheapest', 'k', 2, 5, 10),
    ];
    const { alt } = pickComparisonPair(group);
    expect(alt.id).toBe('cheapest');
  });

  it('never recommends an out-of-stock brand over a pricier in-stock one', () => {
    const group = [
      p('searched', 'k', 0, 10, 10),
      p('cheaper-but-out', 'k', 1, 2, 0),
      p('in-stock', 'k', 2, 8, 5),
    ];
    const { alt } = pickComparisonPair(group);
    expect(alt.id).toBe('in-stock');
  });

  it('falls back to the out-of-stock brand only when nothing else is in stock', () => {
    const group = [
      p('searched', 'k', 0, 10, 10),
      p('only-alt', 'k', 1, 12, 0),
    ];
    const { alt } = pickComparisonPair(group);
    expect(alt.id).toBe('only-alt');
  });
});

describe('isExactNameMatch', () => {
  it('matches when the normalized name equals the query', () => {
    expect(isExactNameMatch('dolo 650', 'Dolo 650')).toBe(true);
  });

  it('matches a whole-word prefix — the brand without its strength/form', () => {
    expect(isExactNameMatch('dolo', 'Dolo 650mg Tablet')).toBe(true);
    expect(isExactNameMatch('dolo 650', 'Dolo 650mg Tablet')).toBe(true);
  });

  it('rejects a partial-word match that only looks like a prefix', () => {
    expect(isExactNameMatch('do', 'Dolo 650mg Tablet')).toBe(false);
    expect(isExactNameMatch('crocin', 'Crocinol Cough Syrup')).toBe(false);
  });

  it('rejects an unrelated fuzzy/salt-only match', () => {
    expect(isExactNameMatch('paracetamol', 'Dolo 650mg Tablet')).toBe(false);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(isExactNameMatch('  DOLO   650  ', 'dolo 650mg tablet')).toBe(true);
  });

  it('is safe for empty input', () => {
    expect(isExactNameMatch('', 'Dolo 650mg Tablet')).toBe(false);
    expect(isExactNameMatch('dolo', '')).toBe(false);
  });
});

describe('scopeToComposition', () => {
  const dolo = { _id: '1', name: 'Dolo 650mg Tablet', compositionKey: 'paracetamol-650mg|tablet' };
  const calpol = { _id: '2', name: 'Calpol 650', compositionKey: 'paracetamol-650mg|tablet' };
  const strayShelcal = { _id: '3', name: 'Shelcal 650', compositionKey: 'calcium-650mg|tablet' };

  it('narrows a brand search to the top result’s own composition', () => {
    const scoped = scopeToComposition([dolo, calpol, strayShelcal], 'dolo 650');
    expect(scoped.map((r) => r._id)).toEqual(['1', '2']);
  });

  it('leaves a broad (salt) search wide — top result is not an exact name match', () => {
    const results = [dolo, strayShelcal];
    expect(scopeToComposition(results, 'paracetamol')).toHaveLength(2);
  });

  it('is a no-op when the top result has no compositionKey', () => {
    const results = [{ _id: '1', name: 'Dolo 650' }, { _id: '2', name: 'Y', compositionKey: 'z' }];
    expect(scopeToComposition(results, 'dolo 650')).toHaveLength(2);
  });

  it('is safe for an empty result set', () => {
    expect(scopeToComposition([], 'dolo')).toEqual([]);
  });
});
