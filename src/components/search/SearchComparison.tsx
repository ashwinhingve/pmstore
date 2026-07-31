import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { computeUnitPrice, formatComposition, type Salt } from '@/lib/pharma/composition';
import { ProductVisual } from '@/components/products/ProductVisual';

/**
 * Same-composition comparison, surfaced from the current search results.
 *
 * Groups the visible results by compositionKey (no extra DB queries) and, for
 * any group with more than one brand, shows a side-by-side card that puts the two
 * leading brands next to each other and leads with the unit price — the only
 * honest way to compare brands (docs/03-DESIGN-SYSTEM.md, CLAUDE.md rule #1). The
 * cheaper-per-unit brand is flagged "Best value" with what it saves per dose; the
 * card links to the full /compare view for the rest. Clicking a brand opens its
 * product page (the Strip).
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
  image: string | null;
  form?: string;
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
  // In-stock first, then cheapest per unit — the Strip's ordering rule. The two
  // leading brands are shown side by side; any others live on the /compare page.
  const ranked = [...group].sort((a, b) => {
    if (a.stock > 0 !== b.stock > 0) return a.stock > 0 ? -1 : 1;
    return a.unitPrice - b.unitPrice;
  });

  const primary = ranked[0]; // best value — leads with the lower unit price
  const secondary = ranked[1]; // the brand shown next to it

  const label =
    primary.salts.length > 0 ? formatComposition(primary.salts) : primary.compositionKey;

  // What the best-value brand saves per dose against the one shown beside it.
  const unitGap = Math.max(0, secondary.unitPrice - primary.unitPrice);
  const pct = secondary.unitPrice > 0 ? Math.round((unitGap / secondary.unitPrice) * 100) : 0;

  // Link to the full side-by-side /compare page — only when both carry a real
  // Mongo id (coerce() can fall back to the slug).
  const isObjectId = (s: string) => /^[a-f0-9]{24}$/i.test(s);
  const compareHref =
    isObjectId(primary._id) && isObjectId(secondary._id)
      ? `/compare?ids=${primary._id},${secondary._id}`
      : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] hover:shadow-[var(--shadow-md)]">
      {/* Header: composition + savings hook */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--foil-soft)] px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--ink)]">{label}</h3>
          <p className="text-xs text-[var(--ink-40)]">
            <span style={mono}>{group.length}</span> brands, same salt
          </p>
        </div>
        {pct > 0 && (
          <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--mint-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--mint)]">
            Save <span style={mono}>{pct}%</span>
          </span>
        )}
      </div>

      {/* The two leading brands, side by side */}
      <div className="grid flex-1 grid-cols-2 divide-x divide-[var(--foil-soft)]">
        <ProductPane p={primary} best noun={unitNoun(primary.packUnit)} savePerUnit={unitGap} />
        <ProductPane p={secondary} noun={unitNoun(secondary.packUnit)} />
      </div>

      {/* Footer: open the full side-by-side compare */}
      {compareHref && (
        <div className="border-t border-[var(--foil-soft)] px-4 py-3">
          <Link
            href={compareHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand)] transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
          >
            {group.length > 2 ? (
              <>
                Compare all <span style={mono}>{group.length}</span> brands
              </>
            ) : (
              'Compare in detail'
            )}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </article>
  );
}

/** One brand column inside a comparison card. Leads with the unit price. */
function ProductPane({
  p,
  best = false,
  noun,
  savePerUnit = 0,
}: {
  p: CompareProduct;
  best?: boolean;
  noun: string;
  savePerUnit?: number;
}) {
  const out = p.stock <= 0;
  return (
    <div
      className={`flex flex-col gap-2 p-3 ${best ? 'bg-[var(--brand-soft)]/40' : ''} ${
        out ? 'opacity-60' : ''
      }`}
    >
      <Link href={`/products/${p.slug}`} className="group block">
        <div className="relative mx-auto aspect-square w-full max-w-[7rem] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)]">
          <ProductVisual imageUrl={p.image} form={p.form} name={p.name} sizes="120px" />
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-1.5">
        {best ? (
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--brand)] px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--brand-ink)]">
            <Check className="h-3 w-3" aria-hidden="true" /> Best value
          </span>
        ) : (
          <span className="inline-flex rounded-[var(--radius-pill)] bg-[var(--foil-soft)] px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--ink-70)]">
            Alternative
          </span>
        )}
        {p.prescriptionRequired && <RxPill />}
      </div>

      <Link href={`/products/${p.slug}`} className="group block min-w-0">
        <p className="truncate font-semibold text-[var(--ink)] group-hover:underline">{p.name}</p>
        <p className="truncate text-xs text-[var(--ink-70)]">{p.manufacturer || '—'}</p>
      </Link>

      {/* Price block — unit price is the headline, pack price below (rule #1). */}
      <div className="mt-auto">
        <p className="leading-none">
          <span style={mono} className="text-lg font-bold text-[var(--ink)]">
            {money(p.unitPrice)}
          </span>
          <span className="text-xs text-[var(--ink-40)]">/{noun}</span>
        </p>
        <p className="mt-1 text-xs text-[var(--ink-70)]">
          <span style={mono}>{money(p.price)}</span> · <span style={mono}>{p.packSize}</span>{' '}
          {p.packUnit}
          {p.mrp != null && p.mrp > p.price && (
            <span style={mono} className="ml-1.5 text-[var(--ink-40)] line-through">
              {money(p.mrp)}
            </span>
          )}
        </p>
        {best && savePerUnit > 0 ? (
          <p style={mono} className="mt-1 text-xs font-semibold text-[var(--mint)]">
            Save {money(savePerUnit)}/{noun}
          </p>
        ) : out ? (
          <p className="mt-1">
            <OutOfStock />
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RxPill() {
  return (
    <span className="rounded bg-[var(--rx-soft)] px-1.5 py-0.5 text-xs font-semibold text-[var(--rx)]">
      Rx
    </span>
  );
}

function OutOfStock() {
  return <span className="text-xs text-[var(--ink-40)]">Out of stock</span>;
}
