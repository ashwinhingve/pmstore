import { Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scheduleLabel, type ScheduleClass } from '@/lib/pharma/format';

/**
 * Prescription-schedule badge. Renders nothing for OTC/G. Uses --rx / --rx-soft,
 * which on this product mean "a doctor is required" — never reuse those tokens
 * for discounts, sales or errors (docs/03-DESIGN-SYSTEM.md, non-negotiable #7).
 */
export function RxBadge({
  scheduleClass,
  className,
}: {
  scheduleClass: ScheduleClass;
  className?: string;
}) {
  const label = scheduleLabel(scheduleClass);
  if (!label) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--rx-soft)] px-2.5 py-1',
        'text-[0.8125rem] font-semibold text-[var(--rx)]',
        className
      )}
    >
      <Pill className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
