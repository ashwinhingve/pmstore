import { describe, it, expect } from 'vitest';
import { COMMON_SALTS, suggestSalts } from './common-salts';

describe('suggestSalts', () => {
  it('returns the shortlist for an empty query', () => {
    expect(suggestSalts('')).toEqual(COMMON_SALTS.slice(0, 8));
  });

  it('ranks prefix matches ahead of substring matches', () => {
    const out = suggestSalts('para');
    expect(out[0]).toBe('Paracetamol');
  });

  it('is case-insensitive and matches within a name', () => {
    expect(suggestSalts('AMOXICILLIN')).toContain('Amoxicillin');
    expect(suggestSalts('clavulanic')).toContain('Amoxicillin + Clavulanic Acid');
  });

  it('maps a known synonym to the canonical salt', () => {
    // "acetaminophen" is aliased to paracetamol in composition.ts
    expect(suggestSalts('acetaminophen')).toContain('Paracetamol');
  });

  it('returns nothing for text off the list (free text is still allowed by the field)', () => {
    expect(suggestSalts('zzzznotasalt')).toEqual([]);
  });
});
