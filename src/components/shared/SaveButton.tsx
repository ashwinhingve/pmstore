'use client';

import { useEffect } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSavedStore } from '@/store/useSavedStore';
import { toast } from '@/store/useToastStore';

/**
 * Save/unsave toggle. The filled state uses --ink, NOT red — on this product red
 * (--rx) means "needs a doctor" and must never signal a saved item.
 */
export function SaveButton({
  productId,
  showLabel = false,
  className,
}: {
  productId: string;
  showLabel?: boolean;
  className?: string;
}) {
  const isSaved = useSavedStore((s) => s.ids.includes(productId));
  const loaded = useSavedStore((s) => s.loaded);
  const load = useSavedStore((s) => s.load);
  const toggle = useSavedStore((s) => s.toggle);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const result = await toggle(productId);
        if (!result.ok) {
          toast.error("Couldn't update saved medicines. Try again.");
        } else {
          toast.success(result.nowSaved ? 'Saved to your medicines' : 'Removed from saved medicines');
        }
      }}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'Remove from saved medicines' : 'Save this medicine'}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 text-[var(--ink)]',
        'border border-[var(--foil-soft)] hover:border-[var(--foil)]',
        className
      )}
    >
      <Heart className={cn('h-5 w-5', isSaved ? 'fill-[var(--ink)] text-[var(--ink)]' : 'text-[var(--ink-40)]')} />
      {showLabel && <span>{isSaved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
