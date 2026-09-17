'use client';

import { formatINR } from '@/lib/pharma/format';
import { formatExpiry, expiryStatus } from '@/lib/pharma/expiry';
import { cn } from '@/lib/utils';

/**
 * Small presentational helpers shared across the inventory admin screens. Values
 * with units render in --font-data (the mono rule, src/components/CLAUDE.md);
 * expiry/low-stock use amber/neutral tints — never --rx red, which is reserved
 * for prescription flags (root CLAUDE.md rule #7).
 */

/** A rupee amount in the data font with tabular numerals. */
export function Money({ value, className = '' }: { value?: number | null; className?: string }) {
  return (
    <span
      className={cn('tabular-nums', className)}
      style={{ fontFamily: 'var(--font-data)' }}
    >
      {formatINR(value ?? 0)}
    </span>
  );
}

/** A plain number in the data font (quantities, counts). */
export function Num({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={cn('tabular-nums', className)} style={{ fontFamily: 'var(--font-data)' }}>
      {value}
    </span>
  );
}

/** Expiry month + status tint. Neutral when no date. */
export function ExpiryCell({ date }: { date?: string | Date | null }) {
  if (!date) return <span className="text-[var(--ink-40)]">—</span>;
  const status = expiryStatus(date);
  return (
    <span
      className="inline-flex items-center gap-1.5 tabular-nums"
      style={{ fontFamily: 'var(--font-data)' }}
    >
      {formatExpiry(date)}
      {status === 'expiring' && (
        <span
          className="rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[0.625rem] font-semibold"
          style={{ backgroundColor: 'var(--tint-amber-soft)', color: 'var(--tint-amber)' }}
        >
          Soon
        </span>
      )}
      {status === 'expired' && (
        <span className="rounded-[var(--radius-pill)] bg-[var(--foil-soft)] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[var(--ink-40)]">
          Expired
        </span>
      )}
    </span>
  );
}

const PILL = 'inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-semibold capitalize';

const PURCHASE_STATUS_STYLE: Record<string, React.CSSProperties> = {
  received: { backgroundColor: 'var(--tint-green-soft, var(--brand-soft))', color: 'var(--tint-green, var(--brand-deep))' },
  draft: { backgroundColor: 'var(--foil-soft)', color: 'var(--ink-70)' },
  ordered: { backgroundColor: 'var(--brand-soft)', color: 'var(--brand-deep)' },
  cancelled: { backgroundColor: 'var(--foil-soft)', color: 'var(--ink-40)' },
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={PILL} style={PURCHASE_STATUS_STYLE[status] ?? PURCHASE_STATUS_STYLE.draft}>
      {status}
    </span>
  );
}

const PAYMENT_STATUS_STYLE: Record<string, React.CSSProperties> = {
  paid: { backgroundColor: 'var(--tint-green-soft, var(--brand-soft))', color: 'var(--tint-green, var(--brand-deep))' },
  partial: { backgroundColor: 'var(--tint-amber-soft)', color: 'var(--tint-amber)' },
  unpaid: { backgroundColor: 'var(--foil-soft)', color: 'var(--ink-70)' },
};

export function PaymentPill({ status }: { status: string }) {
  return (
    <span className={PILL} style={PAYMENT_STATUS_STYLE[status] ?? PAYMENT_STATUS_STYLE.unpaid}>
      {status}
    </span>
  );
}

/** The standard inventory card shell. */
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-xs)]',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Human labels for adjustment reasons and directions. */
export const ADJUSTMENT_REASON_LABELS: Record<string, string> = {
  opening: 'Opening stock',
  recount: 'Stock recount',
  counter_sale: 'Counter sale',
  damage: 'Damage',
  wastage: 'Wastage',
  expiry_writeoff: 'Expiry write-off',
  customer_return: 'Customer return',
  found: 'Found stock',
  other: 'Other',
};

export const RETURN_REASON_LABELS: Record<string, string> = {
  expired: 'Expired',
  near_expiry: 'Near expiry',
  damaged: 'Damaged',
  wrong_item: 'Wrong item',
  overstock: 'Overstock',
  other: 'Other',
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  opening: 'Opening',
  purchase: 'Purchase',
  sale: 'Sale',
  adjustment: 'Adjustment',
  purchase_return: 'Purchase return',
};

/** An empty read of an API error body into a message. */
export function errorMessage(data: unknown, fallback: string): string {
  const d = data as { error?: { message?: string } | string } | undefined;
  if (d && typeof d.error === 'object' && d.error?.message) return d.error.message;
  if (d && typeof d.error === 'string') return d.error;
  return fallback;
}
