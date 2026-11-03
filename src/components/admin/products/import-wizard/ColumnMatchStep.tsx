'use client';

import { CANONICAL_FIELDS } from '@/lib/import/column-detect';

const NOT_MAPPED = '__none__';

/**
 * Match-columns step: show each product field with the spreadsheet column we
 * auto-detected for it, and let the admin correct any guess. Required fields
 * that aren't mapped are flagged in amber so nothing important is missed.
 */
export function ColumnMatchStep({
  rawHeaders,
  sampleRow,
  mapping,
  onChange,
}: {
  rawHeaders: string[];
  sampleRow: Record<string, string> | undefined;
  mapping: Record<string, string | null>;
  onChange: (fieldKey: string, header: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--ink-70)]">
        We matched your spreadsheet columns to product fields automatically. Check the matches
        below and fix any that are wrong. Fields marked{' '}
        <span className="font-semibold text-[var(--tint-amber)]">*</span> are required.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {CANONICAL_FIELDS.map((field) => {
          const selected = mapping[field.key] ?? '';
          const unmappedRequired = field.required && !selected;
          const sample = selected && sampleRow ? (sampleRow[selected] ?? '').trim() : '';
          return (
            <div
              key={field.key}
              className={`rounded-[var(--radius-md)] border p-3 ${
                unmappedRequired
                  ? 'border-[var(--tint-amber)] bg-[var(--tint-amber-soft)]/50'
                  : 'border-[var(--foil-soft)] bg-[var(--paper-card)]'
              }`}
            >
              <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-[var(--ink)]">
                {field.label}
                {field.required && <span className="text-[var(--tint-amber)]" title="Required">*</span>}
              </label>
              <select
                value={selected || NOT_MAPPED}
                onChange={(e) => onChange(field.key, e.target.value === NOT_MAPPED ? null : e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--ink-70)] focus:outline-none"
              >
                <option value={NOT_MAPPED}>— Not in my file —</option>
                {rawHeaders.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {field.hint && <p className="mt-1 text-xs text-[var(--ink-40)]">{field.hint}</p>}
              {sample && (
                <p className="mt-1 truncate text-xs text-[var(--ink-70)]">
                  Example: <span className="text-[var(--ink)]">{sample}</span>
                </p>
              )}
              {unmappedRequired && (
                <p className="mt-1 text-xs font-medium text-[var(--tint-amber)]">
                  Pick the column that holds this, or imported rows will be rejected.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
