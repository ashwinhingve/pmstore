import Link from 'next/link';
import { computeUnitPrice, savingsVs, formatComposition, type Salt } from '@/lib/pharma/composition';

/**
 * Same-composition comparison, surfaced from the current search results.
 *
 * Groups the visible results by compositionKey (no extra DB queries) and, for
 * any group with more than one brand, shows a compact table that leads with the
 * unit price — the only honest way to compare brands (docs/03-DESIGN-SYSTEM.md,
 * CLAUDE.md rule #1). "Best value" = lowest price per unit; "Lowest pack price"
 * = lowest sticker price. Clicking a brand opens its product page (the Strip).
 */

interface CompareProduct {
  _id: string;
  name: string;
  slug: string;
  manufacturer: string;
  price: number;
  mrp?: number;
  packSize: number;
  packUnit: string;
  unitPrice: number;
  stock: number;
  compositionKey: string;
  salts: Salt[];
  prescriptionRequired: boolean;
}

const money = (n: number) => `₹${n.toFixed(2)}`;
const mono = { fontFamily: 'var(--font-data)' as const, fontVariantNumeric: 'tabular-nums' as const };

function coerce(raw: Record<string, unknown>): CompareProduct | null {
  const compositionKey = typeof raw.compositionKey === 'string' ? raw.compositionKey : '';
  const slug = typeof raw.slug === 'string' ? raw.slug : '';
  const name = typeof raw.name === 'string' ? raw.name : '';
  if (!compositionKey || !slug || !name) return null;

  const price = typeof raw.price === 'number' ? raw.price : 0;
  const packSize = typeof raw.packSize === 'number' && raw.packSize > 0 ? raw.packSize : 1;
  const unitPrice = typeof raw.unitPrice === 'number' ? raw.unitPrice : computeUnitPrice(price, packSize);

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
  };
}

export function SearchComparison({ products }: { products: Record<string, unknown>[] }) {
  const groups = new Map<string, CompareProduct[]>();
  for (const raw of products) {
    const p = coerce(raw);
    if (!p) continue;
    const arr = groups.get(p.compositionKey) ?? [];
    arr.push(p);
    groups.set(p.compositionKey, arr);
  }

  // Only groups with more than one brand are worth comparing. Cap at 3 so the
  // page stays scannable; the rest are still in the grid below.
  const comparable = [...groups.values()]
    .filter((g) => g.length >= 2)
    .slice(0, 3);

  if (comparable.length === 0) return null;

  return (
    <section className="mb-6" aria-label="Compare same-composition brands">
      <h2 className="mb-1 text-lg font-bold text-[var(--ink)]">Same composition, compared</h2>
      <p className="mb-4 text-sm text-[var(--ink-70)]">
        These brands contain the same salt. Price is shown per {' '}
        {comparable[0][0].packUnit === 'ml' ? 'ml' : 'tablet/unit'} — the fair way to compare.
      </p>

      <div className="space-y-4">
        {comparable.map((group) => (
          <CompareCard key={group[0].compositionKey} group={group} />
        ))}
      </div>
    </section>
  );
}

function CompareCard({ group }: { group: CompareProduct[] }) {
  // In-stock first, then cheapest per unit — the same ordering rule as the Strip.
  const sorted = [...group].sort((a, b) => {
    if (a.stock > 0 !== b.stock > 0) return a.stock > 0 ? -1 : 1;
    return a.unitPrice - b.unitPrice;
  });

  const inStock = sorted.filter((p) => p.stock > 0);
  const pool = inStock.length ? inStock : sorted;

  const bestValue = pool.reduce((a, b) => (b.unitPrice < a.unitPrice ? b : a));
  const lowestPack = pool.reduce((a, b) => (b.price < a.price ? b : a));
  const dearest = pool.reduce((a, b) => (b.unitPrice > a.unitPrice ? b : a));
  const saving = savingsVs(dearest.unitPrice, bestValue.unitPrice, bestValue.packSize);

  const label =
    bestValue.salts.length > 0 ? formatComposition(bestValue.salts) : bestValue.compositionKey;

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--foil-soft)] px-4 py-3">
        <h3 className="font-semibold text-[var(--ink)]">{label}</h3>
        {saving.percent > 0 && (
          <p className="text-sm text-[var(--mint)]">
            Save up to{' '}
            <span style={mono} className="font-semibold">{saving.percent}%</span>{' '}
            by brand
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--ink-40)]">
              <th scope="col" className="px-4 py-2 font-medium">Brand</th>
              <th scope="col" className="px-4 py-2 font-medium">Per unit</th>
              <th scope="col" className="px-4 py-2 font-medium">Pack</th>
              <th scope="col" className="px-4 py-2 font-medium">Maker</th>
              <th scope="col" className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const out = p.stock <= 0;
              return (
                <tr
                  key={p._id}
                  className={`border-t border-[var(--foil-soft)] ${out ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.slug}`} className="font-medium text-[var(--ink)] hover:underline">
                      {p.name}
                    </Link>
                    {p.prescriptionRequired && (
                      <span className="ml-2 rounded bg-[var(--rx-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--rx)]">
                        Rx
                      </span>
                    )}
                    {out && <span className="ml-2 text-xs text-[var(--ink-40)]">Out of stock</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span style={mono} className="font-semibold text-[var(--ink)]">
                      {money(p.unitPrice)}
                    </span>
                    <span className="text-xs text-[var(--ink-40)]">/{p.packUnit === 'ml' ? 'ml' : 'unit'}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-70)]">
                    <span style={mono}>{money(p.price)}</span>{' '}
                    <span className="text-xs text-[var(--ink-40)]">
                      · <span style={mono}>{p.packSize}</span> {p.packUnit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-70)]">{p.manufacturer || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {p._id === bestValue._id && (
                        <span className="rounded-[var(--radius-pill)] bg-[var(--mint-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--mint)]">
                          Best value
                        </span>
                      )}
                      {p._id === lowestPack._id && p._id !== bestValue._id && (
                        <span className="rounded-[var(--radius-pill)] bg-[var(--foil-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--ink)]">
                          Lowest price
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
