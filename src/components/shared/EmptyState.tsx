import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * EmptyState — an invitation, not an apology (docs/03-DESIGN-SYSTEM.md).
 * Headline names the space, one line explains, one verb CTA. Never "Nothing here."
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-[var(--radius-md)] border border-dashed border-[var(--foil)] px-6 py-16 text-center',
        className
      )}
    >
      {icon && <div className="mb-3 text-[var(--ink-40)]">{icon}</div>}
      <h2 className="text-[length:var(--step-1)] font-semibold text-[var(--ink)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-[var(--ink-70)]">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[var(--ink)] px-5 text-[var(--paper-card)] hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
