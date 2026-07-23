import { describe, it, expect } from 'vitest';
import { buildSynonymGroups } from './synonyms';
import { SALT_ALIASES } from '@/lib/pharma/composition';

describe('buildSynonymGroups', () => {
  it('collapses every alias of a canonical salt into one equivalent group', () => {
    const groups = buildSynonymGroups(SALT_ALIASES, []);
    const paracetamol = groups.find((g) => g.synonyms.includes('paracetamol'));
    expect(paracetamol).toBeDefined();
    // acetaminophen and paracetmol both map to paracetamol in SALT_ALIASES
    expect(paracetamol!.synonyms).toContain('acetaminophen');
    expect(paracetamol!.synonyms).toContain('paracetmol');
    expect(paracetamol!.mappingType).toBe('equivalent');
  });

  it('never emits a group with duplicate terms', () => {
    const groups = buildSynonymGroups(SALT_ALIASES);
    for (const g of groups) {
      expect(new Set(g.synonyms).size).toBe(g.synonyms.length);
    }
  });

  it('never emits a group of fewer than two terms', () => {
    const groups = buildSynonymGroups(SALT_ALIASES);
    for (const g of groups) {
      expect(g.synonyms.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives every group a unique groupKey', () => {
    const groups = buildSynonymGroups(SALT_ALIASES);
    const keys = groups.map((g) => g.groupKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('is deterministic — same input yields identical output ordering', () => {
    const a = JSON.stringify(buildSynonymGroups(SALT_ALIASES));
    const b = JSON.stringify(buildSynonymGroups(SALT_ALIASES));
    expect(a).toBe(b);
  });

  it('merges a curated group into an alias group when they share a term', () => {
    // 'pcm' is a curated abbreviation for paracetamol; it must land in the
    // same group as acetaminophen/paracetmol, not spawn a second one.
    const groups = buildSynonymGroups(SALT_ALIASES, [['paracetamol', 'pcm']]);
    const withPcm = groups.filter((g) => g.synonyms.includes('pcm'));
    expect(withPcm).toHaveLength(1);
    expect(withPcm[0].synonyms).toContain('acetaminophen');
  });

  it('normalizes terms to lowercase and trims whitespace', () => {
    const groups = buildSynonymGroups({ Acetaminophen: 'Paracetamol' } as Record<string, string>, []);
    expect(groups[0].synonyms).toEqual(expect.arrayContaining(['paracetamol', 'acetaminophen']));
    for (const term of groups[0].synonyms) {
      expect(term).toBe(term.toLowerCase().trim());
    }
  });

  it('keeps two unrelated curated groups separate', () => {
    const groups = buildSynonymGroups({}, [
      ['cetirizine', 'cetrizine'],
      ['metformin', 'metphormin'],
    ]);
    expect(groups).toHaveLength(2);
  });
});
