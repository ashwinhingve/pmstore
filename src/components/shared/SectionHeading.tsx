import { cn } from '@/lib/utils';

/**
 * Standard section header: optional mint eyebrow, display-face title,
 * optional one-line description. Keeps heading rhythm identical across pages.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  onDark = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  /** For sections on --surface-hero navy bands. */
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            'mb-2 text-sm font-semibold uppercase tracking-[0.08em]',
            onDark ? 'text-[var(--mint-soft)]' : 'text-[var(--mint)]'
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          'text-[length:var(--step-2)]',
          onDark ? 'text-[var(--paper)]' : 'text-[var(--ink)]'
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn('mt-3', onDark ? 'text-[var(--ink-10)]' : 'text-[var(--ink-70)]')}>
          {description}
        </p>
      )}
    </div>
  );
}
