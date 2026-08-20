'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';

/**
 * Mobile-only filter trigger for the search results page. The results page is a
 * Server Component, so the facet links are rendered on the server and passed in
 * as `children` — this client wrapper only owns the open/close state and hosts
 * them inside the shared Drawer. Hidden from md up, where the sidebar shows inline.
 */
export function SearchFilterDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--foil)] bg-[var(--paper-card)] px-4 py-2 text-sm font-medium text-[var(--ink)] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--mint)]/40"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filters
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Filters" side="left">
        <div className="p-4">{children}</div>
      </Drawer>
    </div>
  );
}
