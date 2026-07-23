'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { ProductCard } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/shared/EmptyState';

interface SavedRow {
  _id: string;
  savedAt: string;
  product: Record<string, unknown>;
}

export default function SavedPage() {
  const [rows, setRows] = useState<SavedRow[] | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/saved');
        if (res.status === 401) {
          setNeedsAuth(true);
          setRows([]);
          return;
        }
        const json = await res.json();
        setRows(json.data ?? []);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-[length:var(--step-2)] font-extrabold text-[var(--ink)]">
        Saved medicines
      </h1>

      {rows === null ? (
        <SkeletonGrid />
      ) : needsAuth ? (
        <EmptyState
          title="Sign in to see your saved medicines"
          description="Save the medicines you buy often and reorder them in one tap."
          action={{ label: 'Sign in', href: '/login' }}
          icon={<Heart className="h-8 w-8" aria-hidden="true" />}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No saved medicines yet"
          description="Save the ones you buy often and reorder in one tap."
          action={{ label: 'Browse medicines', href: '/products' }}
          icon={<Heart className="h-8 w-8" aria-hidden="true" />}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((r) => (
            <li key={r._id}>
              <ProductCard product={r.product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Layout-matched skeleton, not a spinner (avoids CLS). */
function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="animate-pulse rounded-xl border border-[var(--foil-soft)] bg-[var(--paper-card)]">
          <div className="aspect-square rounded-t-xl bg-[var(--foil-soft)]" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/2 rounded bg-[var(--foil-soft)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--foil-soft)]" />
            <div className="h-6 w-1/3 rounded bg-[var(--foil-soft)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
