'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Accessible disclosure for the product page's usage / storage / side-effects /
 * contraindications sections. Button toggles a labelled region; keyboard-operable
 * by default. Medical copy is rendered verbatim by the caller — never summarized.
 */
export function Accordion({
  title,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('border-b border-[var(--foil-soft)]', className)}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-region`}
          id={`${id}-button`}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between py-3 text-left text-[var(--ink)]"
        >
          <span className="font-[family-name:var(--font-display)] font-semibold">{title}</span>
          <ChevronDown
            className={cn('h-5 w-5 shrink-0 text-[var(--ink-40)] transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={`${id}-region`}
        role="region"
        aria-labelledby={`${id}-button`}
        hidden={!open}
        className="pb-4 text-[var(--ink-70)]"
      >
        {children}
      </div>
    </div>
  );
}
