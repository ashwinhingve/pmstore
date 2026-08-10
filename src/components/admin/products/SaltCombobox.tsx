'use client';

import { useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { suggestSalts } from '@/lib/pharma/common-salts';

/**
 * Salt name field with an autocomplete of the pharmacy's most common salts
 * (src/lib/pharma/common-salts.ts). Picking a suggestion keeps spelling
 * consistent so the Strip groups brands correctly, but free text is always
 * allowed for anything off the list. Keyboard: ↑/↓ to move, Enter to pick,
 * Esc to close.
 */
export function SaltCombobox({
  value,
  onChange,
  ariaLabel,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const options = open ? suggestSalts(value) : [];

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && options[active]) {
        e.preventDefault();
        select(options[active]);
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
        placeholder="Salt name, e.g., Paracetamol"
        autoComplete="off"
        required={required}
      />
      {open && options.length > 0 && (
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
        </ul>
      )}
    </div>
  );
}
