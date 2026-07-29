import { cn } from '@/lib/utils';

/**
 * Page-width wrapper — the site rail. Full width (minus padding) on phones and
 * tablets; from xl up it becomes ~80% of the viewport, capped at 1600px, so the
 * page keeps a comfortable margin on desktop and uses large screens better.
 * Use instead of ad-hoc max-w/mx-auto per page so every surface aligns.
 */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:w-4/5',
        className,
      )}
    >
      {children}
    </div>
  );
}
