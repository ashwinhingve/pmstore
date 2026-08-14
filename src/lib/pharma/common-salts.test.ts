import { describe, it, expect } from 'vitest';
import { COMMON_SALTS, suggestSalts, isKnownSalt } from './common-salts';

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

  it('suggests an admin-added salt from the extra pool', () => {
    const out = suggestSalts('norflox', 8, ['Norfloxacin + Tinidazole']);
    expect(out).toContain('Norfloxacin + Tinidazole');
  });

  it('de-duplicates the extra pool case-insensitively, keeping base casing', () => {
    const out = suggestSalts('para', 8, ['paracetamol']);
    expect(out.filter((s) => s.toLowerCase() === 'paracetamol')).toEqual(['Paracetamol']);
  });
});

describe('isKnownSalt', () => {
  it('matches a base salt case-insensitively', () => {
    expect(isKnownSalt('Paracetamol')).toBe(true);
    expect(isKnownSalt('paracetamol')).toBe(true);
  });

  it('is false for a salt not in the base list', () => {
    expect(isKnownSalt('Norfloxacin + Tinidazole')).toBe(false);
  });

  it('matches a salt supplied in the extra pool', () => {
    expect(isKnownSalt('Norfloxacin + Tinidazole', ['Norfloxacin + Tinidazole'])).toBe(true);
    expect(isKnownSalt('norfloxacin + tinidazole', ['Norfloxacin + Tinidazole'])).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(isKnownSalt('  Paracetamol  ')).toBe(true);
  });
});
