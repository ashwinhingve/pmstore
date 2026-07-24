import { cn } from '@/lib/utils';

/**
 * Page-width wrapper — 1200px max (docs/03-DESIGN-SYSTEM.md), consistent
 * horizontal padding. Use instead of ad-hoc max-w/mx-auto per page.
 */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
