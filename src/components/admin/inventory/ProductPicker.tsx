'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PickedProduct {
  _id: string;
  name: string;
  sku: string;
  manufacturer?: string;
  price?: number;
  mrp?: number;
  gstRate?: number;
  packSize?: number;
  packUnit?: string;
  stock?: number;
}

/**
 * Async product search that reuses the existing admin products API. Debounced,
 * keyboard-reachable, shows a real empty/error state. On select it hands the
 * whole product back so a form can pre-fill cost/MRP/GST.
 */
export function ProductPicker({
  onSelect,
  selected,
  placeholder = 'Search a product by name or SKU…',
}: {
  onSelect: (product: PickedProduct | null) => void;
  selected?: PickedProduct | null;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) return; // don't search while a product is chosen
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/products?search=${encodeURIComponent(q)}&limit=8&status=active`);
        const data = await res.json();
        if (!cancelled) {
          setResults(res.ok ? (data.products ?? []) : []);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, selected]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border-2 border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 py-2.5">
        <span className="min-w-0">
          <span className="block truncate font-medium text-[var(--ink)]">{selected.name}</span>
          <span className="block truncate text-xs text-[var(--ink-40)]" style={{ fontFamily: 'var(--font-data)' }}>
            {selected.sku}
            {selected.manufacturer ? ` · ${selected.manufacturer}` : ''}
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery('');
            setResults([]);
          }}
          aria-label="Change product"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-40)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-40)]" />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--ink-40)]" />}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          className={cn(
            'flex h-12 w-full rounded-[var(--radius-sm)] border-2 border-[var(--foil-soft)] bg-[var(--paper-card)] pl-9 pr-9 py-3 text-base',
            'placeholder:text-[var(--ink-40)] focus:outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_4px_var(--brand-soft)]'
          )}
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-md)]">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--ink-40)]">
              {query.trim().length < 2 ? 'Type at least 2 characters' : 'No matching products'}
            </p>
          ) : (
            <ul>
              {results.map((p) => (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(p);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-[var(--foil-soft)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--ink)]">{p.name}</span>
                      <span className="block truncate text-xs text-[var(--ink-40)]" style={{ fontFamily: 'var(--font-data)' }}>
                        {p.sku}
                        {p.manufacturer ? ` · ${p.manufacturer}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--ink-70)]" style={{ fontFamily: 'var(--font-data)' }}>
                      stock {p.stock ?? 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
