'use client';

/**
 * SearchBar — the primary navigation (docs/03-DESIGN-SYSTEM.md § SearchBar).
 *
 * Debounced autocomplete over /api/search/suggest, ARIA combobox + listbox,
 * arrow-key navigation, Enter to select, Escape to close, recent searches on
 * empty focus. A real example placeholder, never "Search products".
 */
import { useEffect, useId, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readRecent, addRecent, clearRecent } from '@/lib/search/recent-searches';

interface Suggestion {
  _id: string;
  name: string;
  slug: string;
  form?: string;
  price?: number;
  unitPrice?: number;
  packSize?: number;
  packUnit?: string;
}

const PLACEHOLDER = 'Dolo 650, paracetamol, blood pressure';
const DEBOUNCE_MS = 200;

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();
  // When the box is empty we show recent searches; otherwise live suggestions.
  const showingRecent = trimmed.length === 0;
  const items: string[] = showingRecent ? recent : suggestions.map((s) => s.name);

  // Debounced suggest fetch, with stale-response cancellation.
  useEffect(() => {
    if (trimmed.length === 0) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('suggest failed');
        const json = await res.json();
        setSuggestions(Array.isArray(json.data) ? json.data : []);
      } catch {
        // Network/abort — leave the last suggestions in place, don't crash the bar.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [trimmed]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submit = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      setRecent(addRecent(t));
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      // Product deep-links (/medicine/[slug]) arrive in Week 3; route to results for now.
      router.push(`/search?q=${encodeURIComponent(t)}`);
    },
    [router]
  );

  const openWithRecent = useCallback(() => {
    setRecent(readRecent());
    setOpen(true);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => (items.length ? (i + 1) % items.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit(activeIndex >= 0 && items[activeIndex] ? items[activeIndex] : query);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showList = open && (showingRecent ? recent.length > 0 : true);

  return (
    <div ref={rootRef} className={cn('relative w-full max-w-2xl', className)}>
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        Search medicines by brand or salt
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ink-40)]"
          aria-hidden="true"
        />
        <input
          id={`${listboxId}-input`}
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder={PLACEHOLDER}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={openWithRecent}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-lg border border-[var(--foil-soft)] bg-[var(--paper-card)] pl-11 pr-10 text-base text-[var(--ink)] placeholder:text-[var(--ink-40)]"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--ink-40)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={showingRecent ? 'Recent searches' : 'Search suggestions'}
          className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-lg border border-[var(--foil-soft)] bg-[var(--paper-card)] py-1 shadow-[var(--shadow-md)]"
        >
          {showingRecent && recent.length > 0 && (
            <li className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-[var(--ink-40)]">
              <span>Recent searches</span>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
                onClick={() => {
                  clearRecent();
                  setRecent([]);
                }}
              >
                Clear
              </button>
            </li>
          )}

          {!showingRecent && loading && items.length === 0 && (
            <li className="px-4 py-3 text-sm text-[var(--ink-40)]" aria-live="polite">
              Searching…
            </li>
          )}

          {!showingRecent && !loading && items.length === 0 && (
            <li className="px-4 py-3 text-sm text-[var(--ink-40)]" aria-live="polite">
              No matches. Press Enter to search anyway.
            </li>
          )}

          {items.map((label, i) => {
            const s = showingRecent ? undefined : suggestions[i];
            return (
              <li
                key={showingRecent ? `recent-${label}` : s?._id ?? `s-${i}`}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={activeIndex === i}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus; select before blur
                  submit(label);
                }}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 text-sm',
                  activeIndex === i ? 'bg-[var(--mint-soft)] text-[var(--ink)]' : 'text-[var(--ink)]'
                )}
              >
                {showingRecent ? (
                  <Clock className="h-4 w-4 shrink-0 text-[var(--ink-40)]" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4 shrink-0 text-[var(--ink-40)]" aria-hidden="true" />
                )}
                <span className="flex-1 truncate">{label}</span>
                {s?.unitPrice != null && (
                  <span className="shrink-0 data text-xs tabular-nums text-[var(--ink-40)]">
                    ₹{s.unitPrice.toFixed(2)}/{s.packUnit ?? 'unit'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
