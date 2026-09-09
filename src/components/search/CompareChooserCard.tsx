'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { formatComposition, type Salt } from '@/lib/pharma/composition';
import { formatPack } from '@/lib/pharma/format';
import { ProductVisual } from '@/components/products/ProductVisual';
import { CompareAddToCart } from '@/components/search/CompareAddToCart';

/**
 * One same-composition comparison card, now with a chooser on the RIGHT.
 *
 * The brand the shopper searched stays fixed on the left (it always leads with
 * the unit price — the only honest way to compare brands, CLAUDE.md rule #1).
 * On the right a <select> lets them pick ANY other same-salt brand to weigh it
 * against; it defaults to the best value (cheapest in stock). When the searched
 * brand is already the cheapest per dose the card says so — a "Best value"
 * flag instead of a misleading comparison — and the right side just shows how
 * much more the other brands cost.
 */

export interface ComparisonBrand {
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
  /** Position in the search results (0 = most relevant to the query). */
  rank: number;
}

const money = (n: number) => `₹${n.toFixed(2)}`;
// Prices/counts read in the normal body sans (client preference, 2026-08-10);
// tabular-nums keeps the figures aligned.
const mono = { fontFamily: 'var(--font-body)' as const, fontVariantNumeric: 'tabular-nums' as const };
const unitNoun = (packUnit: string) => (packUnit === 'ml' ? 'ml' : 'unit');
const isObjectId = (s: string) => /^[a-f0-9]{24}$/i.test(s);

export function CompareChooserCard({ group }: { group: ComparisonBrand[] }) {
  // LEFT is always the brand the shopper searched (most relevant = lowest rank).
  const searched = [...group].sort((a, b) => a.rank - b.rank)[0];
  // Everything else, best value first (in stock, then cheapest per unit).
  const others = group
    .filter((p) => p !== searched)
    .sort((a, b) => {
      if (a.stock > 0 !== b.stock > 0) return a.stock > 0 ? -1 : 1;
      return a.unitPrice - b.unitPrice;
    });

  const selectId = useId();
  const [selectedId, setSelectedId] = useState(others[0]?._id ?? '');
  const chosen = others.find((o) => o._id === selectedId) ?? others[0];

  const label = searched.salts.length > 0 ? formatComposition(searched.salts) : searched.compositionKey;
  const noun = unitNoun(searched.packUnit);

  // The searched brand is the best value when nothing in stock beats it per dose.
  const cheaperExists = others.some((o) => o.stock > 0 && o.unitPrice < searched.unitPrice);
  const searchedIsCheapest = searched.stock > 0 && !cheaperExists;

  // How the chosen brand compares to the searched one, per dose.
  const altIsBetter = chosen ? chosen.unitPrice < searched.unitPrice : false;
  const unitGap = chosen ? Math.abs(searched.unitPrice - chosen.unitPrice) : 0;
  const pct = altIsBetter && searched.unitPrice > 0 ? Math.round((unitGap / searched.unitPrice) * 100) : 0;

  // "Compare all N brands" → the full side-by-side view, searched brand first.
  const allIds = [searched, ...others].map((p) => p._id).filter(isObjectId).slice(0, 8);
  const compareHref = allIds.length >= 2 ? `/compare?ids=${allIds.join(',')}` : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] hover:shadow-[var(--shadow-md)]">
      {/* Header: composition + the hook (savings, or "best value already"). */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--foil-soft)] bg-[var(--brand-tint)] px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-[length:var(--step-1)] font-bold text-[var(--ink)]">{label}</h3>
          <p className="mt-0.5 text-xs text-[var(--ink-70)]">
            <span style={mono}>{group.length}</span> brands · same salt
          </p>
        </div>
        {searchedIsCheapest ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--mint)] px-2.5 py-1 text-xs font-bold text-[var(--brand-ink)] shadow-[var(--shadow-xs)]">
            <Check className="h-3 w-3" aria-hidden="true" /> Best value
          </span>
        ) : pct > 0 ? (
          <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--mint)] px-2.5 py-1 text-xs font-bold text-[var(--brand-ink)] shadow-[var(--shadow-xs)]">
            Save <span style={mono}>{pct}%</span>
          </span>
        ) : null}
      </div>

      <div className="grid flex-1 grid-cols-2 divide-x divide-[var(--foil-soft)]">
        {/* Searched brand — fixed. */}
        <ProductPane
          p={searched}
          role="searched"
          noun={noun}
          bestValue={searchedIsCheapest}
          highlight={searchedIsCheapest}
        />

        {/* Chosen alternative — pick any same-salt brand here. */}
        <div className="flex flex-col">
          <div className="px-3 pt-3">
            <label
              htmlFor={selectId}
              className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--ink-70)]"
            >
              Compare with
            </label>
            <select
              id={selectId}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--accent)]/40 bg-[var(--paper-card)] px-2 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            >
              {others.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name} — {money(o.unitPrice)}/{unitNoun(o.packUnit)}
                  {o.stock <= 0 ? ' (out of stock)' : ''}
                </option>
              ))}
            </select>
          </div>
          {chosen && (
            <ProductPane
              p={chosen}
              role={altIsBetter ? 'deal' : 'pricier'}
              noun={unitNoun(chosen.packUnit)}
              savePerUnit={altIsBetter ? unitGap : 0}
              costMorePerUnit={!altIsBetter && unitGap > 0 ? unitGap : 0}
              highlight={altIsBetter}
            />
          )}
        </div>
      </div>

      {compareHref && (
        <div className="border-t border-[var(--foil-soft)] px-4 py-3">
          <Link
            href={compareHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand)] transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
          >
            Compare all <span style={mono}>{group.length}</span> brands
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </article>
  );
}

/** One brand column inside the comparison card. Leads with the unit price. */
function ProductPane({
  p,
  role,
  noun,
  savePerUnit = 0,
  costMorePerUnit = 0,
  bestValue = false,
  highlight = false,
}: {
  p: ComparisonBrand;
  role: 'searched' | 'deal' | 'alt' | 'pricier';
  noun: string;
  savePerUnit?: number;
  costMorePerUnit?: number;
  bestValue?: boolean;
  highlight?: boolean;
}) {
  const out = p.stock <= 0;
  return (
    <div
      className={`relative flex flex-col gap-2 p-3 ${
        highlight ? 'bg-[var(--brand-soft)]/60 ring-1 ring-inset ring-[var(--brand)]/20' : ''
      } ${out ? 'opacity-60' : ''}`}
    >
      <Link href={`/products/${p.slug}`} className="group block">
        <div className="relative mx-auto aspect-square w-full max-w-[7rem] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)]">
          <ProductVisual imageUrl={p.image} form={p.form} name={p.name} sizes="120px" />
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-1.5">
        {role === 'searched' ? (
          bestValue ? (
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--mint-soft)] px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--mint)]">
              <Check className="h-3 w-3" aria-hidden="true" /> Best value
            </span>
          ) : (
            <span className="inline-flex rounded-[var(--radius-pill)] bg-[var(--foil-soft)] px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--ink-70)]">
              You searched
            </span>
          )
        ) : role === 'deal' ? (
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--brand)] px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--brand-ink)]">
            <Check className="h-3 w-3" aria-hidden="true" /> Better deal
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
          <span style={mono}>{money(p.price)}</span> ·{' '}
          <span style={mono}>{formatPack(p.packSize, p.packUnit)}</span>
          {p.mrp != null && p.mrp > p.price && (
            <span style={mono} className="ml-1.5 text-[var(--ink-40)] line-through">
              {money(p.mrp)}
            </span>
          )}
        </p>
        {role === 'deal' && savePerUnit > 0 ? (
          <p style={mono} className="mt-1 text-xs font-semibold text-[var(--mint)]">
            Save {money(savePerUnit)}/{noun}
          </p>
        ) : costMorePerUnit > 0 ? (
          // Never red — a pricier alternative isn't a prescription flag or an error.
          <p style={mono} className="mt-1 text-xs font-medium text-[var(--ink-40)]">
            +{money(costMorePerUnit)}/{noun} more
          </p>
        ) : out ? (
          <p className="mt-1">
            <OutOfStock />
          </p>
        ) : null}
      </div>

      {/* Add to cart — available straight from the comparison, on both brands. */}
      <CompareAddToCart
        product={{
          _id: p._id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image: p.image,
          packSize: p.packSize,
          packUnit: p.packUnit,
          unitPrice: p.unitPrice,
          mrp: p.mrp,
          prescriptionRequired: p.prescriptionRequired,
          stock: p.stock,
        }}
      />
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
