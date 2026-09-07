'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ManufacturerCombobox } from '@/components/admin/products/ManufacturerCombobox';
import { SaltCombobox } from '@/components/admin/products/SaltCombobox';
import type { RenderCellProps } from 'react-data-grid';
import {
  parseCompositionShorthand,
  saltsToshorthand,
  normalizeAndValidateForm,
} from '@/lib/import/composition-shorthand-parser';
import type { BulkProductRow } from '@/lib/validations/bulk-product-import';
import { PHARMA_CATEGORIES } from '@/lib/categories';

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
    <Input
      value={value}
      onChange={(e) => onRowChange({ ...row, [key]: e.target.value })}
      className="h-8 text-sm"
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
    <Input
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
      className="h-8 text-sm"
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
      className="h-8 w-full rounded-sm border border-[var(--foil-soft)] bg-[var(--paper)] px-2 text-sm text-[var(--ink)]"
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
 * Manufacturer combobox editor — allows selecting from known manufacturers
 * or adding a new one inline.
 */
export function ManufacturerEditor({
  row,
  column,
  onRowChange,
  catalogManufacturers = [],
  onAddManufacturer,
}: RenderCellProps<BulkProductRow> & {
  catalogManufacturers?: string[];
  onAddManufacturer?: (name: string) => void | Promise<void>;
}) {
  return (
    <div className="h-8 overflow-hidden rounded-sm border border-[var(--foil-soft)]">
      <ManufacturerCombobox
        value={row.manufacturer || ''}
        onChange={(v) => onRowChange({ ...row, manufacturer: v })}
        ariaLabel="Manufacturer"
        catalogManufacturers={catalogManufacturers}
        onAddManufacturer={onAddManufacturer}
      />
    </div>
  );
}

/**
 * Category autocomplete editor
 */
export function CategoryEditor({
  row,
  column,
  onRowChange,
}: RenderCellProps<BulkProductRow>) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = row.category || '';
  const query = value.toLowerCase();
  const suggestions = open
    ? PHARMA_CATEGORIES.filter((c) =>
        c.name.toLowerCase().includes(query)
      )
        .slice(0, 8)
        .map((c) => c.name)
    : [];

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onRowChange({ ...row, category: e.target.value });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className="h-8 text-sm"
        autoFocus
        placeholder="Start typing..."
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-0.5 rounded-sm border border-[var(--foil-soft)] bg-[var(--paper)] shadow-sm z-50">
          {suggestions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                onRowChange({ ...row, category: cat });
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--foil-soft)] text-[var(--ink)]"
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Composition editor — compact shorthand with a popover for precision editing
 * when shorthand doesn't parse cleanly.
 */
export function CompositionEditor({
  row,
  column,
  onRowChange,
  catalogSalts = [],
  onAddSalt,
}: RenderCellProps<BulkProductRow> & {
  catalogSalts?: string[];
  onAddSalt?: (name: string) => void | Promise<void>;
}) {
  const [showPopover, setShowPopover] = useState(false);
  const shorthand = saltsToshorthand(row.salts);
  const [shorthandInput, setShorthandInput] = useState(shorthand);
  const [parseError, setParseError] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const handleAddSalt = async (name: string) => {
    if (onAddSalt) {
      await onAddSalt(name);
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={shorthandInput}
        onChange={(e) => handleShorthandChange(e.target.value)}
        placeholder="e.g. Paracetamol 650mg + Caffeine 50mg"
        className={`h-8 text-sm ${parseError ? 'border-[var(--ink)]' : ''}`}
        autoFocus
        onFocus={() => setShowPopover(true)}
        onBlur={() => setTimeout(() => setShowPopover(false), 100)}
      />
      {parseError && (
        <div className="text-xs text-[var(--ink)] mt-1">{parseError}</div>
      )}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 right-0 mt-2 p-3 rounded-sm border border-[var(--foil-soft)] bg-[var(--paper)] shadow-lg z-50 max-w-sm"
        >
          <div className="text-xs font-medium text-[var(--ink)] mb-2">
            Composition
          </div>
          <div className="space-y-2">
            {row.salts.map((salt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <SaltCombobox
                    value={salt.name}
                    onChange={(v) => {
                      const newSalts = [...row.salts];
                      newSalts[idx].name = v;
                      onRowChange({ ...row, salts: newSalts });
                    }}
                    ariaLabel={`Salt ${idx + 1} name`}
                    catalogSalts={catalogSalts}
                    onAddSalt={handleAddSalt}
                  />
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={salt.strength}
                  onChange={(e) => {
                    const newSalts = [...row.salts];
                    newSalts[idx].strength = parseFloat(e.target.value) || 0;
                    onRowChange({ ...row, salts: newSalts });
                  }}
                  className="w-16 h-7 px-2 text-xs border border-[var(--foil-soft)] rounded-sm"
                  placeholder="Strength"
                />
                <select
                  value={salt.unit}
                  onChange={(e) => {
                    const newSalts = [...row.salts];
                    newSalts[idx].unit = e.target.value as any;
                    onRowChange({ ...row, salts: newSalts });
                  }}
                  className="w-12 h-7 px-1 text-xs border border-[var(--foil-soft)] rounded-sm"
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
                  className="h-7 w-7 rounded-sm hover:bg-[var(--foil-soft)] text-[var(--ink-70)] flex items-center justify-center"
                  type="button"
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
            className="mt-2 text-xs px-2 py-1 rounded-sm bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-[var(--paper)]"
            type="button"
          >
            Add salt
          </button>
        </div>
      )}
    </div>
  );
}
