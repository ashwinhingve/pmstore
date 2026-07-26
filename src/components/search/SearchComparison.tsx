import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { computeUnitPrice, savingsVs, formatComposition, type Salt } from '@/lib/pharma/composition';

/**
 * Same-composition comparison, surfaced from the current search results.
 *
 * Groups the visible results by compositionKey (no extra DB queries) and, for
 * any group with more than one brand, shows a comparison card that leads with the
 * unit price — the only honest way to compare brands (docs/03-DESIGN-SYSTEM.md,
 * CLAUDE.md rule #1). The cheapest-per-unit brand is highlighted as "Best value";
 * the rest are listed below it with the amount they cost over the winner. Clicking
 * a brand opens its product page (the Strip).
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
const unitNoun = (packUnit: string) => (packUnit === 'ml' ? 'ml' : 'unit');

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
    <section className="mb-8" aria-label="Compare same-composition brands">
      <h2 className="mb-1 text-[length:var(--step-2)] font-bold text-[var(--ink)]">
        Same composition, compared
      </h2>
      <p className="mb-5 max-w-2xl text-sm text-[var(--ink-70)]">
        These brands contain the same salt. We lead with the price per{' '}
        {comparable[0][0].packUnit === 'ml' ? 'ml' : 'tablet'} — the fair way to compare, since a
        cheaper-looking pack can cost more per dose.
      </p>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
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

  // The best-value brand shows first as a highlighted winner; the rest follow.
  const rest = sorted.filter((p) => p._id !== bestValue._id);

  // Link the two leading brands to the /compare page — only when both carry a
  // real Mongo id (coerce() can fall back to the slug).
  const isObjectId = (s: string) => /^[a-f0-9]{24}$/i.test(s);
  const topTwo =
    sorted.length >= 2 && isObjectId(sorted[0]._id) && isObjectId(sorted[1]._id)
      ? `/compare?ids=${sorted[0]._id},${sorted[1]._id}`
      : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-sm)]">
      {/* Header: composition + savings */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--foil-soft)] px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--ink)]">{label}</h3>
          <p className="text-xs text-[var(--ink-40)]">
            <span style={mono}>{group.length}</span> brands, same salt
          </p>
        </div>
        {saving.percent > 0 && (
          <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--mint-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--mint)]">
            Save up to <span style={mono}>{saving.percent}%</span>
          </span>
        )}
      </div>

      {/* Winner — the cheapest per unit, highlighted */}
      <Link
        href={`/products/${bestValue.slug}`}
        className={`group block border-l-4 border-[var(--mint)] bg-[var(--mint-soft)]/60 px-4 py-3.5 transition-colors duration-[var(--dur-fast)] hover:bg-[var(--mint-soft)] ${
          bestValue.stock <= 0 ? 'opacity-60' : ''
        }`}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--mint)] px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--paper-card)]">
            <Check className="h-3 w-3" aria-hidden="true" /> Best value
          </span>
          {bestValue.prescriptionRequired && <RxPill />}
          {bestValue.stock <= 0 && <OutOfStock />}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--ink)] group-hover:underline">
              {bestValue.name}
            </p>
            <p className="truncate text-xs text-[var(--ink-70)]">{bestValue.manufacturer || '—'}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="leading-none">
              <span style={mono} className="text-xl font-bold text-[var(--ink)]">
                {money(bestValue.unitPrice)}
              </span>
              <span className="text-xs text-[var(--ink-40)]">/{unitNoun(bestValue.packUnit)}</span>
            </p>
            <p className="mt-1 text-xs text-[var(--ink-70)]">
              <span style={mono}>{money(bestValue.price)}</span> ·{' '}
              <span style={mono}>{bestValue.packSize}</span> {bestValue.packUnit}
            </p>
          </div>
        </div>
      </Link>

      {/* Other brands */}
      <ul className="divide-y divide-[var(--foil-soft)]">
        {rest.map((p) => {
          const out = p.stock <= 0;
          return (
            <li key={p._id}>
              <Link
                href={`/products/${p.slug}`}
                className={`flex items-end justify-between gap-3 px-4 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-[var(--paper-tint)] ${
                  out ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2">
                    <span className="truncate font-medium text-[var(--ink)]">{p.name}</span>
                    {p.prescriptionRequired && <RxPill />}
                  </p>
                  <p className="truncate text-xs text-[var(--ink-70)]">
                    {p.manufacturer || '—'}
                    {p._id === lowestPack._id && p._id !== bestValue._id && (
                      <span className="ml-1.5 text-[var(--ink-40)]">· lowest pack price</span>
                    )}
                    {out && <OutOfStock inline />}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="leading-none">
                    <span style={mono} className="font-semibold text-[var(--ink)]">
                      {money(p.unitPrice)}
                    </span>
                    <span className="text-xs text-[var(--ink-40)]">/{unitNoun(p.packUnit)}</span>
                  </p>
                  {!out && p.unitPrice > bestValue.unitPrice && (
                    <p style={mono} className="mt-1 text-xs text-[var(--ink-40)]">
                      +{money(p.unitPrice - bestValue.unitPrice)}/{unitNoun(p.packUnit)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {topTwo && (
        <div className="mt-auto border-t border-[var(--foil-soft)] px-4 py-3">
          <Link
            href={topTwo}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--mint)] transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
          >
            Compare top two side by side
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </article>
  );
}

function RxPill() {
  return (
    <span className="rounded bg-[var(--rx-soft)] px-1.5 py-0.5 text-xs font-semibold text-[var(--rx)]">
      Rx
    </span>
  );
}

function OutOfStock({ inline = false }: { inline?: boolean }) {
  return (
    <span className={`text-xs text-[var(--ink-40)] ${inline ? 'ml-1.5' : ''}`}>
      {inline ? '· out of stock' : 'Out of stock'}
    </span>
  );
}
