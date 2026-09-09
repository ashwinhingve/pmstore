import { computeUnitPrice, type Salt } from '@/lib/pharma/composition';
import { groupComparableProducts } from '@/lib/search/comparison';
import { CompareChooserCard, type ComparisonBrand } from '@/components/search/CompareChooserCard';

/**
 * Same-composition comparison, surfaced from the current search results.
 *
 * Groups the visible results by compositionKey (no extra DB queries) and, for
 * any group with more than one brand, renders a card: the brand the shopper
 * searched on the LEFT, and a chooser on the RIGHT to weigh it against any
 * other same-salt brand (defaulting to the best value). The card always leads
 * with the unit price — the only honest way to compare brands
 * (docs/03-DESIGN-SYSTEM.md, CLAUDE.md rule #1) — and links to the full
 * /compare view for all brands at once.
 */

function coerce(raw: Record<string, unknown>): ComparisonBrand | null {
  const compositionKey = typeof raw.compositionKey === 'string' ? raw.compositionKey : '';
  const slug = typeof raw.slug === 'string' ? raw.slug : '';
  const name = typeof raw.name === 'string' ? raw.name : '';
  if (!compositionKey || !slug || !name) return null;

  const price = typeof raw.price === 'number' ? raw.price : 0;
  const packSize = typeof raw.packSize === 'number' && raw.packSize > 0 ? raw.packSize : 1;
  const unitPrice = typeof raw.unitPrice === 'number' ? raw.unitPrice : computeUnitPrice(price, packSize);
  const images = Array.isArray(raw.images) ? (raw.images as { url?: string }[]) : [];

  return {
    _id: String(raw._id ?? slug),
    name,
    slug,
    manufacturer: typeof raw.manufacturer === 'string' ? raw.manufacturer : '',
    price,
    mrp: typeof raw.mrp === 'number' ? raw.mrp : undefined,
    packSize,
    packUnit: typeof raw.packUnit === 'string' ? raw.packUnit : 'unit',
    unitPrice,
    stock: typeof raw.stock === 'number' ? raw.stock : 0,
    compositionKey,
    salts: Array.isArray(raw.salts) ? (raw.salts as Salt[]) : [],
    prescriptionRequired: raw.prescriptionRequired === true,
    image: images[0]?.url ?? null,
    form: typeof raw.form === 'string' ? raw.form : undefined,
    rank: 0,
  };
}

export function SearchComparison({ products }: { products: Record<string, unknown>[] }) {
  const coerced = products
    .map((raw, idx) => {
      const p = coerce(raw);
      if (p) p.rank = idx; // results arrive in relevance order — index 0 is the top match
      return p;
    })
    .filter((p): p is ComparisonBrand => p !== null);

  // Only groups with more than one brand are worth comparing. Show the group
  // that holds the most relevant result first, and cap at 3 so the page stays
  // scannable; the rest are still in the grid below.
  const comparable = groupComparableProducts(coerced, 3);

  if (comparable.length === 0) return null;

  const noun = comparable[0][0].packUnit === 'ml' ? 'ml' : 'tablet';

  return (
    <section className="mb-8" aria-label="Compare same-composition brands">
      <h2 className="mb-1 text-[length:var(--step-2)] font-bold text-[var(--ink)]">
        Same composition, compared
      </h2>
      <p className="mb-5 max-w-2xl text-sm text-[var(--ink-70)]">
        The medicine you searched is on the left; choose any same-salt brand on the right to
        compare — the fair way, since a cheaper-looking pack can cost more per {noun}.
      </p>

      {comparable.length === 1 ? (
        // A single group (typically a brand search) reads better at a comfortable
        // width than stranded in a wide multi-column grid.
        <div className="max-w-2xl">
          <CompareChooserCard group={comparable[0]} />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {comparable.map((group) => (
            <CompareChooserCard key={group[0].compositionKey} group={group} />
          ))}
        </div>
      )}
    </section>
  );
}
