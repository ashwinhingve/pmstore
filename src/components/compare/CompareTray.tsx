'use client';

import { useEffect, useState } from 'react';
import { Scale, X } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';

/**
 * Floating reminder while a comparison is half-built: one product picked,
 * one to go. Disappears once the picker is empty (or full — picking the
 * second product navigates straight to /compare).
 */
export function CompareTray() {
  const picks = useCompareStore((s) => s.picks);
  const clear = useCompareStore((s) => s.clear);
  const [mounted, setMounted] = useState(false);

  // sessionStorage-backed state differs between server and first client
  // render — only show after hydration.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || picks.length !== 1) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[80] flex max-w-[calc(100vw-1.5rem)] items-center gap-2.5 rounded-[var(--radius-pill)] border border-[var(--foil-soft)] bg-[var(--paper-card)] py-2 pl-4 pr-2 shadow-[var(--shadow-lg)]">
      <Scale className="h-4 w-4 shrink-0 text-[var(--mint)]" aria-hidden="true" />
      <p className="truncate text-[0.875rem] text-[var(--ink)]">
        Comparing <span className="font-semibold">{picks[0].name}</span> — pick one more
      </p>
      <button
        type="button"
        onClick={clear}
        aria-label="Stop comparing"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-40)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
