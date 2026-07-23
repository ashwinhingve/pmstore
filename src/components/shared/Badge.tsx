import { cn } from '@/lib/utils';

/**
 * Small pill label. `--rx` is intentionally NOT a tone here — prescription flags
 * use RxBadge, and red must never leak into commerce badges.
 */
export type BadgeTone = 'mint' | 'ink' | 'neutral' | 'muted';

const TONES: Record<BadgeTone, string> = {
  mint: 'bg-[var(--mint-soft)] text-[var(--mint)]',
  ink: 'bg-transparent text-[var(--ink)] ring-2 ring-[var(--ink)] ring-inset',
  neutral: 'bg-[var(--foil-soft)] text-[var(--ink-70)]',
  muted: 'bg-[var(--foil-soft)] text-[var(--ink-40)]',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
