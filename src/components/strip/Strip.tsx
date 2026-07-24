import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatINR, packUnitShort } from '@/lib/pharma/format';
import { Badge } from '@/components/shared/Badge';
import type { StripViewModel } from '@/lib/pharma/strip';
import type { RankedAlternative } from '@/lib/pharma/composition';

/**
 * The Strip — the signature price-comparison module, drawn as a blister pack.
 * Server Component: it renders complete from the pre-ranked view-model
 * (buildStrip), no client fetch, no loading state.
 *
 * unitPrice is the headline number; pack size and pack price sit below it,
 * smaller. Out-of-stock brands stay visible but dimmed and last — knowing a
 * cheaper option exists, even unavailable, is useful.
 */
export function Strip({ strip }: { strip: StripViewModel }) {
  const { alternatives } = strip;
  // Nothing to compare against → no Strip.
  if (alternatives.length < 2) return null;

  const current = alternatives.find((a) => a.badges.includes('current'));
  const cheapest = alternatives.find((a) => a.badges.includes('cheapest'));
  const unit = packUnitShort(current?.packUnit ?? alternatives[0].packUnit);

  const canSave =
    cheapest && current && cheapest.slug !== current.slug && cheapest.savings
      ? cheapest
      : null;

  return (
    <section
      aria-label={`Cheaper equivalents of ${strip.composition}`}
      className="rounded-[var(--radius-lg)] border border-[var(--foil)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-md)] sm:p-5"
    >
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[length:var(--step-1)] font-semibold text-[var(--ink)]">
          Same salt, {alternatives.length} brands
        </h2>
        <span className="pack shrink-0 text-[length:var(--step--1)] text-[var(--ink-70)]">
          priced per {unit}
        </span>
      </header>

      <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
        {alternatives.map((alt) => (
          <li key={alt._id} className="snap-start">
            <Pill alt={alt} />
          </li>
        ))}
      </ul>

      {canSave && (
        <p className="mt-3 text-[0.875rem] text-[var(--mint)]">
          ↘ Switch to {canSave.name} and save {formatINR(canSave.savings!.perPack)} on this strip
        </p>
      )}
    </section>
  );
}

function Pill({ alt }: { alt: RankedAlternative }) {
  const outOfStock = alt.stock <= 0;
  const isCurrent = alt.badges.includes('current');

  return (
    <Link
      href={`/products/${alt.slug}`}
      aria-label={`${alt.name}, ${formatINR(alt.unitPrice)} per ${packUnitShort(alt.packUnit)}${
        outOfStock ? ', out of stock' : ''
      }`}
      className={cn(
        'flex h-full w-32 flex-col gap-1 rounded-[var(--radius-sm)] border bg-[var(--paper-card)] p-2.5 transition-[border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)]',
        isCurrent
          ? 'border-2 border-[var(--ink)] shadow-[var(--shadow-xs)]'
          : 'border border-[var(--foil-soft)] hover:border-[var(--foil)] hover:shadow-[var(--shadow-sm)]',
        outOfStock && 'opacity-60'
      )}
    >
      <div className="flex min-h-5 flex-wrap gap-1">
        {isCurrent && <Badge tone="ink">Viewing</Badge>}
        {!isCurrent && alt.badges.includes('cheapest') && <Badge tone="mint">Cheapest</Badge>}
        {alt.badges.includes('best-rated') && <Badge tone="neutral">Top rated</Badge>}
        {outOfStock && <Badge tone="muted">Out of stock</Badge>}
      </div>

      <span className="font-[family-name:var(--font-display)] text-[0.875rem] font-semibold leading-tight text-[var(--ink)]">
        {alt.name}
      </span>

      {/* Headline: price per unit. */}
      <span className="price text-[length:var(--step-1)] font-semibold text-[var(--ink)]">
        {formatINR(alt.unitPrice)}
      </span>

      {/* Secondary: pack size then pack price. */}
      <span className="pack text-[length:var(--step--1)] text-[var(--ink-70)]">
        {alt.packSize} {packUnitShort(alt.packUnit)}
      </span>
      <span className="price text-[length:var(--step--1)] text-[var(--ink-40)]">
        {formatINR(alt.price)}
      </span>
    </Link>
  );
}
