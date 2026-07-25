import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/shared/Badge';
import { RxBadge } from '@/components/shared/RxBadge';
import { formatINR, packUnitShort, type ScheduleClass } from '@/lib/pharma/format';
import type { CompareProduct } from '@/lib/pharma/compare';

/**
 * One side of the /compare page. unitPrice is the headline — pack size and
 * pack price sit below it, smaller (CLAUDE.md rule #1). Out-of-stock brands
 * stay visible but dimmed, exactly like the Strip.
 */
export function CompareCard({ product, isBest }: { product: CompareProduct; isBest: boolean }) {
  const outOfStock = product.stock <= 0;
  const unit = packUnitShort(product.packUnit);

  return (
    <article
      aria-label={`${product.name}, ${formatINR(product.unitPrice)} per ${unit}${
        outOfStock ? ', out of stock' : ''
      }`}
      className={cn(
        'flex h-full flex-col gap-3 rounded-[var(--radius-lg)] bg-[var(--paper-card)] p-5 shadow-[var(--shadow-sm)] sm:p-6',
        isBest ? 'border-2 border-[var(--mint)]' : 'border border-[var(--foil-soft)]',
        outOfStock && 'opacity-60'
      )}
    >
      <div className="flex min-h-7 flex-wrap items-center gap-1.5">
        {isBest && <Badge tone="mint">Best option</Badge>}
        {product.scheduleClass && <RxBadge scheduleClass={product.scheduleClass as ScheduleClass} />}
        {outOfStock && <Badge tone="muted">Out of stock</Badge>}
      </div>

      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[length:var(--step-1)] font-semibold leading-tight text-[var(--ink)]">
          {product.name}
        </h2>
        <p className="mt-1 text-[length:var(--step--1)] text-[var(--ink-70)]">{product.manufacturer}</p>
      </div>

      {/* Headline: price per unit. */}
      <p className="price text-[length:var(--step-2)] font-semibold text-[var(--ink)]">
        {formatINR(product.unitPrice)}
        <span className="text-[length:var(--step--1)] font-normal text-[var(--ink-70)]">/{unit}</span>
      </p>

      {/* Secondary: pack size, pack price, MRP. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="pack text-[length:var(--step--1)] text-[var(--ink-70)]">
          {product.packSize} {unit} pack
        </span>
        <span className="price text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
          {formatINR(product.price)}
        </span>
        {product.mrp && product.mrp > product.price && (
          <span className="price text-[length:var(--step--1)] text-[var(--ink-40)] line-through">
            MRP {formatINR(product.mrp)}
          </span>
        )}
      </div>

      <Link
        href={`/products/${product.slug}`}
        className="mt-auto inline-flex min-h-11 w-fit items-center rounded-[var(--radius-sm)] border border-[var(--foil-soft)] px-4 text-[length:var(--step--1)] font-semibold text-[var(--ink)] transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--foil)] hover:shadow-[var(--shadow-sm)]"
      >
        View product
      </Link>
    </article>
  );
}
