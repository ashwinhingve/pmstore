'use client';

import { useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

/** Case-insensitive substring suggestions from the admin-added catalogue. */
function suggestManufacturers(query: string, limit: number, catalog: string[]): string[] {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of catalog) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    if (!q || key.includes(q)) {
      seen.add(key);
      out.push(name);
      if (out.length >= limit) break;
    }
  }
  return out;
}

function isKnownManufacturer(value: string, catalog: string[]): boolean {
  const v = value.trim().toLowerCase();
  return !!v && catalog.some((n) => n.toLowerCase() === v);
}

/**
 * Manufacturer field with an autocomplete of the manufacturers the admin has
 * added to the catalogue (`catalogManufacturers`). Picking a suggestion keeps
 * spelling consistent so products group under one maker, but free text is always
 * allowed. When the typed name isn't known yet, an "Add …" row offers to save it
 * to the catalogue via `onAddManufacturer` so it's suggested next time.
 * Keyboard: ↑/↓ to move, Enter to pick, Esc to close.
 */
export function ManufacturerCombobox({
  value,
  onChange,
  ariaLabel,
  required,
  catalogManufacturers = [],
  onAddManufacturer,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  required?: boolean;
  catalogManufacturers?: string[];
  onAddManufacturer?: (name: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const options = open ? suggestManufacturers(value, 8, catalogManufacturers) : [];
  const trimmed = value.trim();
  const canAdd =
    open && !!onAddManufacturer && trimmed.length > 0 && !isKnownManufacturer(value, catalogManufacturers);
  // Keyboard navigation spans the suggestions plus the optional "Add" row (last).
  const itemCount = options.length + (canAdd ? 1 : 0);
  const addIndex = canAdd ? options.length : -1;

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setActive(-1);
  };

  const addManufacturer = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    onAddManufacturer?.(name);
    select(name);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((a) => Math.min(a + 1, itemCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && active >= 0) {
        if (active === addIndex) {
          e.preventDefault();
          addManufacturer(value);
        } else if (options[active]) {
          e.preventDefault();
          select(options[active]);
        }
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <Input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="e.g., Cipla"
        autoComplete="off"
        required={required}
      />
      {open && itemCount > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] py-1 shadow-[var(--shadow-md)]"
        >
          {options.map((opt, i) => (
            <li key={opt} role="option" aria-selected={i === active}>
              <button
                type="button"
                // Keep the input focused so the click registers before onBlur closes the list.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(opt)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-10 w-full items-center px-3 py-2 text-left text-sm ${
                  i === active
                    ? 'bg-[var(--brand-soft)] text-[var(--ink)]'
                    : 'text-[var(--ink-70)] hover:bg-[var(--foil-soft)]'
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
          {canAdd && (
            <li role="option" aria-selected={active === addIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addManufacturer(value)}
                onMouseEnter={() => setActive(addIndex)}
                className={`flex min-h-10 w-full items-center gap-1.5 border-t border-[var(--foil-soft)] px-3 py-2 text-left text-sm font-medium text-[var(--brand)] ${
                  active === addIndex ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--brand-soft)]'
                }`}
              >
                <span aria-hidden="true">+</span>
                <span>Add &ldquo;{trimmed}&rdquo; to manufacturer list</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
