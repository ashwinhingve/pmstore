import { formatExpiry, expiryStatus } from '@/lib/pharma/expiry';

/**
 * Batch expiry, shown on every product card (government requirement). The date
 * renders in the data font (the mono rule, docs/03-DESIGN-SYSTEM.md). Stock that
 * is close to or past expiry is flagged in amber / neutral — never `--rx` red,
 * which is reserved for prescription flags (root CLAUDE.md rule #7).
 *
 * Pure and server-safe: no state, no effects, so it drops into both Server
 * Components (Strip, CompareCard) and Client Components (ProductCard).
 */
export function ExpiryLine({
  date,
  className = '',
}: {
  date: string | Date;
  className?: string;
}) {
  const status = expiryStatus(date);
  return (
    <p
      className={`flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-[var(--ink-70)] ${className}`}
      style={{ fontFamily: 'var(--font-data)', fontVariantNumeric: 'tabular-nums' }}
    >
      <span>Exp {formatExpiry(date)}</span>
      {status === 'expiring' && (
        <span
          className="rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[0.625rem] font-semibold"
          style={{ backgroundColor: 'var(--tint-amber-soft)', color: 'var(--tint-amber)' }}
        >
          Expiring soon
        </span>
      )}
      {status === 'expired' && (
        <span className="rounded-[var(--radius-pill)] bg-[var(--foil-soft)] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[var(--ink-40)]">
          Expired
        </span>
      )}
    </p>
  );
}
