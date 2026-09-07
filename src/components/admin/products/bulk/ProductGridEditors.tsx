'use client';

import { useState } from 'react';
import type { RenderCellProps } from 'react-data-grid';
import {
  parseCompositionShorthand,
  saltsToshorthand,
} from '@/lib/import/composition-shorthand-parser';
import type { BulkProductRow } from '@/lib/validations/bulk-product-import';

/**
 * Shared look for a plain in-cell editor: fills the row height, single-weight
 * border, brand focus. Deliberately slimmer than the page `Input` (which is
 * h-12 / border-2) so editors sit flush inside a grid cell.
 */
const CELL_INPUT_CLASS =
  'h-full w-full border-2 border-[var(--brand)] bg-[var(--paper-card)] px-2 text-sm text-[var(--ink)] focus:outline-none';

/**
 * Shared `<datalist>` ids. react-data-grid cells set `overflow: clip`, which
 * hides any custom (absolutely-positioned) dropdown rendered inside a cell —
 * that is why the old combobox editors appeared to have "no options". Native
 * `<datalist>` / `<select>` popups are painted by the browser outside the DOM,
 * so they are never clipped. The lists themselves are rendered once in
 * `ProductBulkGrid` and referenced here by id.
 */
export const DL_MANUFACTURERS = 'pm-dl-manufacturers';
export const DL_CATEGORIES = 'pm-dl-categories';
export const DL_SALTS = 'pm-dl-salts';

/**
 * Text input editor for simple fields (sku, name, price, etc.)
 */
export function TextEditor({
  row,
  column,
  onRowChange,
}: RenderCellProps<BulkProductRow>) {
  const key = column.key as keyof BulkProductRow;
  const value = String(row[key] ?? '');

  return (
    <input
      value={value}
      onChange={(e) => onRowChange({ ...row, [key]: e.target.value })}
      className={CELL_INPUT_CLASS}
      autoFocus
    />
  );
}

/**
 * Number input editor for numeric fields
 */
export function NumberEditor({
  row,
  column,
  onRowChange,
}: RenderCellProps<BulkProductRow>) {
  const key = column.key as keyof BulkProductRow;
  const value = row[key] ?? '';

  return (
    <input
      type="number"
      step="0.01"
      value={String(value)}
      onChange={(e) => {
        const num = parseFloat(e.target.value);
        onRowChange({
          ...row,
          [key]: Number.isFinite(num) ? num : 0,
        });
      }}
      className={`${CELL_INPUT_CLASS} text-right`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      autoFocus
    />
  );
}

/**
 * Dropdown editor for enum fields (form, scheduleClass, etc.)
 */
export function SelectEditor({
  row,
  column,
  onRowChange,
  options,
}: RenderCellProps<BulkProductRow> & { options: string[] }) {
  const key = column.key as keyof BulkProductRow;
  const value = String(row[key] ?? '');

  return (
    <select
      value={value}
      onChange={(e) => onRowChange({ ...row, [key]: e.target.value })}
      className={CELL_INPUT_CLASS}
      autoFocus
    >
      <option value="">—</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

/**
 * Checkbox editor for boolean fields
 */
export function CheckboxEditor({
  row,
  column,
  onRowChange,
}: RenderCellProps<BulkProductRow>) {
  const key = column.key as keyof BulkProductRow;
  const isChecked = Boolean(row[key]);

  return (
    <input
      type="checkbox"
      checked={isChecked}
      onChange={(e) => onRowChange({ ...row, [key]: e.target.checked })}
      className="h-4 w-4"
      style={{ cursor: 'pointer' }}
      autoFocus
    />
  );
}

/**
 * Manufacturer editor — a native `<input list>` backed by the shared
 * `DL_MANUFACTURERS` datalist. The browser paints the suggestion popup, so it
 * escapes the cell's `overflow: clip`. Free text is allowed (a new manufacturer
 * saves with the product).
 */
export function ManufacturerEditor({
  row,
  onRowChange,
}: RenderCellProps<BulkProductRow>) {
  return (
    <input
      type="text"
      list={DL_MANUFACTURERS}
      value={row.manufacturer || ''}
      onChange={(e) => onRowChange({ ...row, manufacturer: e.target.value })}
      className={CELL_INPUT_CLASS}
      aria-label="Manufacturer"
      placeholder="e.g. Cipla"
      autoFocus
    />
  );
}

/**
 * Category editor — a native `<input list>` backed by the shared `DL_CATEGORIES`
 * datalist (the store's real categories merged with the canonical taxonomy).
 * Free text is allowed so the import can still create a new category by name.
 */
export function CategoryEditor({
  row,
  onRowChange,
}: RenderCellProps<BulkProductRow>) {
  return (
    <input
      type="text"
      list={DL_CATEGORIES}
      value={row.category || ''}
      onChange={(e) => onRowChange({ ...row, category: e.target.value })}
      className={CELL_INPUT_CLASS}
      aria-label="Category"
      placeholder="Start typing…"
      autoFocus
    />
  );
}

/**
 * Composition editor — compact shorthand with a popover for precision editing
 * when shorthand doesn't parse cleanly.
 */
export function CompositionEditor({
  row,
  onRowChange,
}: RenderCellProps<BulkProductRow>) {
  const [showPopover, setShowPopover] = useState(false);
  const [shorthandInput, setShorthandInput] = useState(() => saltsToshorthand(row.salts));
  const [parseError, setParseError] = useState('');

  const handleShorthandChange = (text: string) => {
    setShorthandInput(text);
    const result = parseCompositionShorthand(text);
    if (result.ok) {
      setParseError('');
      onRowChange({ ...row, salts: result.salts! });
    } else {
      setParseError(result.error || 'Invalid composition');
    }
  };

  return (
    <div className="pm-cell-editor relative h-full">
      <input
        type="text"
        value={shorthandInput}
        onChange={(e) => handleShorthandChange(e.target.value)}
        placeholder="e.g. Paracetamol 650mg + Caffeine 50mg"
        className={`${CELL_INPUT_CLASS} ${parseError ? '!border-[var(--ink)]' : ''}`}
        autoFocus
        onFocus={() => setShowPopover(true)}
        // Keep the popover open long enough for a click inside it to land.
        onBlur={() => setTimeout(() => setShowPopover(false), 150)}
      />
      {showPopover && (
        <div
          className="absolute top-full left-0 z-50 mt-2 w-[22rem] max-w-[80vw] rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-3 shadow-[var(--shadow-md)]"
          // Prevent the input's blur from firing before an inner click.
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink)]">Composition</span>
            {parseError && (
              <span className="text-xs font-medium text-[var(--ink)]">{parseError}</span>
            )}
          </div>
          <div className="space-y-2">
            {row.salts.map((salt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  list={DL_SALTS}
                  value={salt.name}
                  onChange={(e) => {
                    const newSalts = row.salts.map((s, i) =>
                      i === idx ? { ...s, name: e.target.value } : s
                    );
                    onRowChange({ ...row, salts: newSalts });
                  }}
                  aria-label={`Salt ${idx + 1} name`}
                  placeholder="Salt name"
                  className="h-8 flex-1 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] px-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  value={salt.strength}
                  onChange={(e) => {
                    const newSalts = row.salts.map((s, i) =>
                      i === idx ? { ...s, strength: parseFloat(e.target.value) || 0 } : s
                    );
                    onRowChange({ ...row, salts: newSalts });
                  }}
                  className="h-8 w-16 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] px-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                  placeholder="0"
                  aria-label={`Salt ${idx + 1} strength`}
                />
                <select
                  value={salt.unit}
                  onChange={(e) => {
                    const unit = e.target.value as BulkProductRow['salts'][number]['unit'];
                    const newSalts = row.salts.map((s, i) =>
                      i === idx ? { ...s, unit } : s
                    );
                    onRowChange({ ...row, salts: newSalts });
                  }}
                  aria-label={`Salt ${idx + 1} unit`}
                  className="h-8 w-14 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] px-1 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                >
                  <option value="mg">mg</option>
                  <option value="mcg">mcg</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="iu">iu</option>
                  <option value="%">%</option>
                </select>
                <button
                  onClick={() => {
                    const newSalts = row.salts.filter((_, i) => i !== idx);
                    onRowChange({ ...row, salts: newSalts });
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-70)] hover:bg-[var(--foil-soft)]"
                  type="button"
                  aria-label={`Remove salt ${idx + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              onRowChange({
                ...row,
                salts: [...row.salts, { name: '', strength: 0, unit: 'mg' }],
              });
            }}
            className="mt-2 rounded-[var(--radius-sm)] bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--brand-deep)] hover:bg-[var(--brand)] hover:text-[var(--brand-ink)]"
            type="button"
          >
            Add salt
          </button>
        </div>
      )}
    </div>
  );
}
