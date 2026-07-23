import { describe, it, expect } from 'vitest';
import {
  normalizeSaltName,
  normalizeForm,
  buildCompositionKey,
  formatComposition,
  computeUnitPrice,
  savingsVs,
  rankAlternatives,
  type Salt,
  type AlternativeCandidate,
} from './composition';

/**
 * Tier-1 tests for the composition layer (docs/07-TESTING.md).
 *
 * This is the foundation of formula search, price comparison and alternative
 * suggestions — 100% coverage is required. Two rules from CLAUDE.md are load
 * bearing here: comparisons must use `unitPrice`, never `price` (rule #1), and
 * `compositionKey`/`unitPrice` are derived, never hand-entered (rule #2).
 */

describe('normalizeSaltName', () => {
  it('resolves aliases to the canonical salt (acetaminophen -> paracetamol)', () => {
    expect(normalizeSaltName('acetaminophen')).toBe('paracetamol');
    expect(normalizeSaltName('salbutamol')).toBe('albuterol');
  });

  it('is case-insensitive', () => {
    expect(normalizeSaltName('Acetaminophen')).toBe('paracetamol');
    expect(normalizeSaltName('ACETAMINOPHEN')).toBe('paracetamol');
  });

  it('strips salt-form suffixes (amlodipine besylate -> amlodipine)', () => {
    expect(normalizeSaltName('Amlodipine Besylate')).toBe('amlodipine');
    expect(normalizeSaltName('metformin hydrochloride')).toBe('metformin');
    expect(normalizeSaltName('pantoprazole sodium')).toBe('pantoprazole');
  });

  it('never strips the only remaining word (a lone suffix stays intact)', () => {
    // "sodium" alone is a single word — the while-loop stops before emptying it.
    expect(normalizeSaltName('sodium')).toBe('sodium');
  });

  it('re-checks the alias table after stripping a suffix', () => {
    // "frusemide sodium" -> strip "sodium" -> "frusemide" -> alias -> "furosemide"
    expect(normalizeSaltName('frusemide sodium')).toBe('furosemide');
  });

  it('drops parenthetical notes', () => {
    expect(normalizeSaltName('Paracetamol (Acetaminophen)')).toBe('paracetamol');
  });
});

describe('normalizeForm', () => {
  it('groups clinically interchangeable forms', () => {
    expect(normalizeForm('capsule')).toBe('tablet');
    expect(normalizeForm('suspension')).toBe('syrup');
    expect(normalizeForm('ointment')).toBe('cream');
  });

  it('leaves non-equivalent forms unchanged', () => {
    expect(normalizeForm('injection')).toBe('injection');
    expect(normalizeForm('tablet')).toBe('tablet');
  });
});

describe('buildCompositionKey', () => {
  it('builds the canonical key for a single salt', () => {
    const salts: Salt[] = [{ name: 'Paracetamol', strength: 650, unit: 'mg' }];
    expect(buildCompositionKey(salts, 'tablet')).toBe('paracetamol-650mg|tablet');
  });

  it('converts units so 500 mcg groups with 0.5 mg', () => {
    const mcg = buildCompositionKey([{ name: 'levothyroxine', strength: 500, unit: 'mcg' }], 'tablet');
    const mg = buildCompositionKey([{ name: 'levothyroxine', strength: 0.5, unit: 'mg' }], 'tablet');
    expect(mcg).toBe(mg);
    expect(mcg).toBe('levothyroxine-0.5mg|tablet');
  });

  it('converts grams so 1 g groups with 1000 mg', () => {
    const g = buildCompositionKey([{ name: 'metformin', strength: 1, unit: 'g' }], 'tablet');
    const mg = buildCompositionKey([{ name: 'metformin', strength: 1000, unit: 'mg' }], 'tablet');
    expect(g).toBe(mg);
    expect(g).toBe('metformin-1000mg|tablet');
  });

  it('is order-independent for multi-salt formulas (A+B === B+A)', () => {
    const a: Salt[] = [
      { name: 'Amoxicillin', strength: 500, unit: 'mg' },
      { name: 'Clavulanic Acid', strength: 125, unit: 'mg' },
    ];
    const b: Salt[] = [
      { name: 'Clavulanic Acid', strength: 125, unit: 'mg' },
      { name: 'Amoxicillin', strength: 500, unit: 'mg' },
    ];
    expect(buildCompositionKey(a, 'tablet')).toBe(buildCompositionKey(b, 'tablet'));
    expect(buildCompositionKey(a, 'tablet')).toBe(
      'amoxicillin-500mg+clavulanic acid-125mg|tablet',
    );
  });

  it('treats equivalent forms as the same key (capsule groups with tablet)', () => {
    const salts: Salt[] = [{ name: 'Amoxicillin', strength: 500, unit: 'mg' }];
    expect(buildCompositionKey(salts, 'capsule')).toBe(buildCompositionKey(salts, 'tablet'));
  });

  it('throws when no salts are provided', () => {
    expect(() => buildCompositionKey([], 'tablet')).toThrow(/at least one salt/);
    // @ts-expect-error — exercising the runtime guard against null input
    expect(() => buildCompositionKey(null, 'tablet')).toThrow();
  });
});

describe('formatComposition', () => {
  it('produces a human-readable single-salt label', () => {
    expect(formatComposition([{ name: 'paracetamol', strength: 650, unit: 'mg' }])).toBe(
      'Paracetamol 650 mg',
    );
  });

  it('joins multiple salts with " + "', () => {
    expect(
      formatComposition([
        { name: 'amoxicillin', strength: 500, unit: 'mg' },
        { name: 'clavulanic acid', strength: 125, unit: 'mg' },
      ]),
    ).toBe('Amoxicillin 500 mg + Clavulanic Acid 125 mg');
  });
});

describe('computeUnitPrice', () => {
  it('rounds price-per-unit to two decimals', () => {
    // CLAUDE.md rule #1: a ₹28 strip of 15 costs MORE per tablet than a ₹52 strip of 30.
    expect(computeUnitPrice(52, 30)).toBe(1.73);
    expect(computeUnitPrice(28, 15)).toBe(1.87);
    expect(computeUnitPrice(28, 15)).toBeGreaterThan(computeUnitPrice(52, 30));
  });

  it('returns the price unchanged when packSize is 0, negative, or missing', () => {
    expect(computeUnitPrice(10, 0)).toBe(10);
    expect(computeUnitPrice(10, -5)).toBe(10);
    // @ts-expect-error — modelling a product with no packSize set
    expect(computeUnitPrice(10, undefined)).toBe(10);
  });
});

describe('savingsVs', () => {
  it('computes per-unit, per-pack and percent savings', () => {
    // current 2.00/unit, alt 1.50/unit, pack of 30
    expect(savingsVs(2, 1.5, 30)).toEqual({ perUnit: 0.5, perPack: 15, percent: 25 });
  });

  it('reports 0 percent when the current unit price is 0', () => {
    expect(savingsVs(0, 1.5, 30).percent).toBe(0);
  });
});

describe('rankAlternatives', () => {
  const make = (over: Partial<AlternativeCandidate> & { _id: string }): AlternativeCandidate => ({
    name: over._id,
    slug: over._id,
    manufacturer: 'Acme',
    price: 100,
    packSize: 10,
    packUnit: 'tablet',
    unitPrice: 1,
    stock: 10,
    averageRating: 0,
    totalReviews: 0,
    ...over,
  });

  it('returns an empty array for no candidates', () => {
    expect(rankAlternatives([], 'x')).toEqual([]);
  });

  it('assigns badges and applies the 5-review floor for best-rated', () => {
    const candidates = [
      // highest rating but only 3 reviews -> must NOT win best-rated
      make({ _id: 'b', unitPrice: 1.5, averageRating: 5.0, totalReviews: 3, orderCount: 2 }),
      // best-rated: highest rating among those with >= 5 reviews
      make({ _id: 'a', unitPrice: 2.0, averageRating: 4.8, totalReviews: 10, orderCount: 5 }),
      // current + most popular
      make({ _id: 'c', unitPrice: 3.0, averageRating: 4.0, totalReviews: 20, orderCount: 100 }),
    ];
    const ranked = rankAlternatives(candidates, 'c');
    const badgeOf = (id: string) => ranked.find((r) => r._id === id)!.badges;

    expect(badgeOf('b')).toContain('cheapest');
    expect(badgeOf('b')).not.toContain('best-rated'); // 5-review floor
    expect(badgeOf('a')).toContain('best-rated');
    expect(badgeOf('c')).toContain('current');
    expect(badgeOf('c')).toContain('most-popular');
  });

  it('awards no best-rated badge when nothing clears the 5-review floor', () => {
    const candidates = [
      make({ _id: 'a', unitPrice: 2, averageRating: 4.9, totalReviews: 4 }),
      make({ _id: 'b', unitPrice: 3, averageRating: 4.5, totalReviews: 1 }),
    ];
    const ranked = rankAlternatives(candidates, 'a');
    expect(ranked.some((r) => r.badges.includes('best-rated'))).toBe(false);
  });

  it('sets savings only for cheaper, non-current alternatives', () => {
    const candidates = [
      make({ _id: 'cur', unitPrice: 2.0 }),
      make({ _id: 'cheaper', unitPrice: 1.5, packSize: 30 }),
      make({ _id: 'dearer', unitPrice: 2.5 }),
      make({ _id: 'same', unitPrice: 2.0 }),
    ];
    const ranked = rankAlternatives(candidates, 'cur');
    const savingsOf = (id: string) => ranked.find((r) => r._id === id)!.savings;

    expect(savingsOf('cur')).toBeNull(); // current product never shows savings vs itself
    expect(savingsOf('dearer')).toBeNull(); // not cheaper
    expect(savingsOf('same')).toBeNull(); // equal, not strictly cheaper
    expect(savingsOf('cheaper')).toEqual({ perUnit: 0.5, perPack: 15, percent: 25 });
  });

  it('sorts out-of-stock items last and ignores them for the cheapest badge', () => {
    const candidates = [
      make({ _id: 'oos-cheap', unitPrice: 1.0, stock: 0 }), // lowest price overall, but OOS
      make({ _id: 'in-dear', unitPrice: 3.0, stock: 5 }),
      make({ _id: 'in-cheap', unitPrice: 2.0, stock: 5 }),
    ];
    const ranked = rankAlternatives(candidates, 'in-dear');

    // In-stock items come first, ordered by unitPrice; the out-of-stock item is last.
    expect(ranked.map((r) => r._id)).toEqual(['in-cheap', 'in-dear', 'oos-cheap']);
    // Cheapest is computed from the in-stock pool, so the OOS item does not win it.
    expect(ranked.find((r) => r._id === 'in-cheap')!.badges).toContain('cheapest');
    expect(ranked.find((r) => r._id === 'oos-cheap')!.badges).not.toContain('cheapest');
  });

  it('falls back to the full list when every candidate is out of stock', () => {
    const candidates = [
      make({ _id: 'a', unitPrice: 2.0, stock: 0 }),
      make({ _id: 'b', unitPrice: 1.0, stock: 0 }),
    ];
    const ranked = rankAlternatives(candidates, 'a');
    // With no in-stock pool, cheapest is drawn from all candidates.
    expect(ranked.find((r) => r._id === 'b')!.badges).toContain('cheapest');
  });

  it('keeps the running winner when a later candidate does not beat it', () => {
    // Winners lead the list, so each reducer must reject (not replace) the
    // trailing candidates — exercising the "keep accumulator" side of every pick.
    const candidates = [
      make({ _id: 'lead', unitPrice: 1, averageRating: 4.9, totalReviews: 10, orderCount: 50 }),
      make({ _id: 'mid', unitPrice: 2, averageRating: 4.5, totalReviews: 10, orderCount: 10 }),
      make({ _id: 'last', unitPrice: 3, averageRating: 4.0, totalReviews: 10, orderCount: 1 }),
    ];
    const ranked = rankAlternatives(candidates, 'mid');
    const badgeOf = (id: string) => ranked.find((r) => r._id === id)!.badges;
    expect(badgeOf('lead')).toEqual(
      expect.arrayContaining(['cheapest', 'best-rated', 'most-popular']),
    );
  });

  it('best-rated tracks a later, higher-rated candidate', () => {
    // Ratings ascending in list order, so the reducer must replace its
    // accumulator with the trailing candidate (the "b beats a" side of the pick).
    const candidates = [
      make({ _id: 'low', unitPrice: 1, averageRating: 4.0, totalReviews: 10 }),
      make({ _id: 'high', unitPrice: 2, averageRating: 4.8, totalReviews: 10 }),
    ];
    const ranked = rankAlternatives(candidates, 'low');
    expect(ranked.find((r) => r._id === 'high')!.badges).toContain('best-rated');
  });

  it('orders a mixed stock pair the same way regardless of input order', () => {
    // A two-element sort calls the comparator once, so each ordering drives a
    // different branch of the stock tie-breaker (-1 vs 1).
    const inStock = make({ _id: 'in', unitPrice: 5, stock: 3 });
    const outOfStock = make({ _id: 'out', unitPrice: 1, stock: 0 });

    expect(rankAlternatives([inStock, outOfStock], 'in').map((r) => r._id)).toEqual(['in', 'out']);
    expect(rankAlternatives([outOfStock, inStock], 'in').map((r) => r._id)).toEqual(['in', 'out']);
  });
});
