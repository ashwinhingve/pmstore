/**
 * Synonym-group generator for Atlas Search.
 *
 * Pure and deterministic — no database. Folds the `SALT_ALIASES` map (which is
 * alias -> canonical) plus a curated list of common misspellings/abbreviations
 * into disjoint `equivalent` synonym groups. Overlapping inputs (a curated pair
 * that shares a term with an alias group) are merged so Atlas never receives two
 * groups that describe the same equivalence.
 *
 * `scripts/build-search-synonyms.ts` writes the output to the `salt_synonyms`
 * collection; the Atlas Search index references it.
 */

export interface SynonymGroup {
  mappingType: 'equivalent';
  synonyms: string[];
  /** Stable, deterministic key (the alphabetically-first term) for idempotent upserts. */
  groupKey: string;
}

/**
 * Common Indian-pharmacy misspellings, abbreviations and international spellings
 * not already captured by `SALT_ALIASES`. Salt-level only — brand-name matching
 * is handled by fuzzy text search on the product name, not by synonyms.
 */
export const CURATED_SYNONYMS: string[][] = [
  ['paracetamol', 'pcm'],
  ['amoxicillin', 'amoxycillin'],
  ['cetirizine', 'cetrizine'],
  ['azithromycin', 'azithromicin'],
  ['pantoprazole', 'pantoprazol'],
  ['metformin', 'metphormin'],
  ['omeprazole', 'omeprazol'],
  ['diclofenac', 'diclophenac'],
];

function normalize(term: string): string {
  return term.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Union-find over term sets: merge any groups sharing at least one term. */
function mergeOverlapping(rawGroups: string[][]): string[][] {
  const merged: Set<string>[] = [];

  for (const raw of rawGroups) {
    const terms = raw.map(normalize).filter(Boolean);
    if (!terms.length) continue;

    // Find every existing set that shares a term with this group.
    const hits = merged.filter((set) => terms.some((t) => set.has(t)));

    if (hits.length === 0) {
      merged.push(new Set(terms));
      continue;
    }

    // Fold this group and all overlapping sets into the first hit, then drop the rest.
    const target = hits[0];
    for (const t of terms) target.add(t);
    for (const other of hits.slice(1)) {
      for (const t of other) target.add(t);
      merged.splice(merged.indexOf(other), 1);
    }
  }

  return merged.map((set) => [...set]);
}

export function buildSynonymGroups(
  aliases: Record<string, string>,
  curated: string[][] = CURATED_SYNONYMS
): SynonymGroup[] {
  // Alias groups: canonical + every alias that points to it.
  const byCanonical = new Map<string, Set<string>>();
  for (const [alias, canonical] of Object.entries(aliases)) {
    const key = normalize(canonical);
    if (!byCanonical.has(key)) byCanonical.set(key, new Set([key]));
    byCanonical.get(key)!.add(normalize(alias));
  }

  const rawGroups: string[][] = [
    ...[...byCanonical.values()].map((s) => [...s]),
    ...curated,
  ];

  return mergeOverlapping(rawGroups)
    .filter((terms) => terms.length >= 2)
    .map((terms) => {
      const synonyms = [...terms].sort();
      return { mappingType: 'equivalent' as const, synonyms, groupKey: synonyms[0] };
    })
    .sort((a, b) => a.groupKey.localeCompare(b.groupKey));
}
