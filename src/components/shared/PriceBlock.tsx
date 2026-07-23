import { cn } from '@/lib/utils';
import { formatINR, discountPercent } from '@/lib/pharma/format';

/**
 * PriceBlock (docs/03-DESIGN-SYSTEM.md).
 *
 *   ₹30.50   MRP ₹36.00   Save 15%
 *   ₹2.03 per tablet · 15 tablets
 *
 * The per-unit line is ALWAYS present — `unitPrice` is how brands are honestly
 * compared. MRP struck in --ink-40, savings in --mint (never red).
 */
export function PriceBlock({
  price,
  mrp,
  unitPrice,
  packSize,
  packUnit,
  className,
}: {
  price: number;
  mrp?: number;
  unitPrice: number;
  packSize: number;
  packUnit: string;
  className?: string;
}) {
  const off = discountPercent(mrp, price);
  const pluralUnit =
    ['tablet', 'capsule'].includes(packUnit) && packSize !== 1 ? `${packUnit}s` : packUnit;

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="price text-[length:var(--step-1)] font-semibold text-[var(--ink)]">
          {formatINR(price)}
        </span>
        {mrp && mrp > price && (
          <span className="price text-[var(--ink-40)] line-through">MRP {formatINR(mrp)}</span>
        )}
        {off > 0 && <span className="text-[0.8125rem] font-semibold text-[var(--mint)]">Save {off}%</span>}
      </div>
      <p className="pack text-[length:var(--step--1)] text-[var(--ink-70)]">
        {formatINR(unitPrice)} per {packUnit} · {packSize} {pluralUnit}
      </p>
    </div>
  );
}
