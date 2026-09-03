/**
 * Pure grouping/selection logic behind the search page's same-composition
 * comparison cards (src/components/search/SearchComparison.tsx). Kept here,
 * apart from the component, so the rules — which groups are worth showing,
 * which brand is the "alternative" — are unit-tested without a DOM.
 */

export interface ComparableProduct {
  compositionKey: string;
  stock: number;
  unitPrice: number;
  /** Position in the search results; 0 = most relevant to the query. */
  rank: number;
}

const minRank = <T extends ComparableProduct>(g: T[]): number => Math.min(...g.map((p) => p.rank));

/**
 * Groups products by `compositionKey` and keeps only groups with 2+ brands —
 * a single brand has nothing to compare against. Groups are ordered by their
 * most relevant member and capped at `maxGroups` so the page stays scannable.
 */
export function groupComparableProducts<T extends ComparableProduct>(
  products: T[],
  maxGroups = 3,
): T[][] {
  const groups = new Map<string, T[]>();
  for (const p of products) {
    const arr = groups.get(p.compositionKey) ?? [];
    arr.push(p);
    groups.set(p.compositionKey, arr);
  }

  return [...groups.values()]
    .filter((g) => g.length >= 2)
    .sort((a, b) => minRank(a) - minRank(b))
    .slice(0, maxGroups);
}

/**
 * Picks the fixed left/right pair for a comparison card: the searched brand
 * (most relevant result in the group) on the left, and the best-value
 * same-salt alternative on the right — in stock first, then cheapest per
 * unit. The order never flips once picked.
 */
export function pickComparisonPair<T extends ComparableProduct>(group: T[]): { searched: T; alt: T } {
  const searched = [...group].sort((a, b) => a.rank - b.rank)[0];
  const alt = group
    .filter((p) => p !== searched)
    .sort((a, b) => {
      if (a.stock > 0 !== b.stock > 0) return a.stock > 0 ? -1 : 1;
      return a.unitPrice - b.unitPrice;
    })[0];
  return { searched, alt };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    // Pack names often run strength into its unit ("650mg", "5ml") with no
    // space — split those so a query like "dolo 650" still lands on a word
    // boundary against "Dolo 650mg Tablet" rather than mid-token.
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ');
}

/**
 * Whether `name` is a match for the searched medicine, not just a fuzzy/salt
 * hit that happens to share the same composition. True on an exact (normalized)
 * match, or when `name` starts with `query` on a whole-word boundary — e.g.
 * "dolo" matches "Dolo 650mg Tablet", but "do" does not. This gates whether the
 * search page's same-composition comparison card is worth showing at all: a
 * comparison built around a name the shopper didn't actually search for is
 * confusing, not helpful.
 */
export function isExactNameMatch(query: string, name: string): boolean {
  const q = normalize(query);
  const n = normalize(name);
  if (!q || !n) return false;
  if (n === q) return true;
  return n.startsWith(q) && (n.length === q.length || n[q.length] === ' ');
}
