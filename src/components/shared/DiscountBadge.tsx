import { cn } from '@/lib/utils';
import { discountPercent } from '@/lib/pharma/format';

/**
 * DiscountBadge — a bold "N% OFF" pill, shown wherever a product with a genuine
 * saving appears (cards, detail buy-box, comparison).
 *
 * The percentage is computed from MRP and the selling price with the shared
 * `discountPercent` helper (`((MRP − price) / MRP) × 100`, rounded). The badge
 * renders nothing when there is no honest saving — MRP missing, zero, or at/below
 * the selling price — so a negative or misleading discount can never show.
 *
 * Colour is brand orange (`--brand`), never `--rx` red: on a pharmacy red means
 * "needs a doctor" (root CLAUDE.md rule #7), so it must never mark a discount.
 *
 * The component only draws the pill. Callers that want it in a card corner wrap
 * it in an absolutely-positioned element (see ProductCard); tables pass
 * `size="sm"` for an inline chip.
 */
export function DiscountBadge({
  mrp,
  price,
  size = 'md',
  className,
}: {
  mrp?: number;
  price: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const off = discountPercent(mrp, price);
  if (off <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--brand)] font-semibold uppercase tracking-wide tabular-nums text-[var(--brand-ink)] shadow-[var(--shadow-xs)]',
        size === 'sm' ? 'px-1.5 py-0.5 text-[0.625rem]' : 'px-2 py-0.5 text-[0.6875rem]',
        className,
      )}
      style={{ fontFamily: 'var(--font-data)' }}
    >
      {off}% OFF
    </span>
  );
}
