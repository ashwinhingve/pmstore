'use client';

import type * as React from 'react';
import { DataGrid, type Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import './product-bulk-grid.css';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { BulkProductRow } from '@/lib/validations/bulk-product-import';
import { PHARMA_CATEGORIES } from '@/lib/categories';
import {
  TextEditor,
  NumberEditor,
  SelectEditor,
  CheckboxEditor,
  ManufacturerEditor,
  CategoryEditor,
  CompositionEditor,
  DL_MANUFACTURERS,
  DL_CATEGORIES,
  DL_SALTS,
} from './ProductGridEditors';

interface ProductBulkGridProps {
  rows: BulkProductRow[];
  onRowsChange: (rows: BulkProductRow[]) => void;
  manufacturers: string[];
  salts: string[];
  categories: string[];
  images: Record<string, { url: string; publicId: string }>;
  duplicateWarnings: Record<
    string,
    { sku: string; message: string; matches: any[] }
  >;
}

const DOSAGE_FORMS = [
  'tablet',
  'capsule',
  'syrup',
  'suspension',
  'injection',
  'cream',
  'ointment',
  'gel',
  'drops',
  'inhaler',
  'powder',
  'sachet',
  'spray',
  'patch',
  'other',
];

const SCHEDULE_CLASSES = ['OTC', 'H', 'H1', 'X', 'G'];
const GST_RATES = [0, 5, 12, 18, 28];

/** Read-mode cell for a dropdown/picker column: value plus a ▾ so it's clearly
 *  editable. Double-clicking the cell opens the editor. */
function PickerCell({ value }: { value: React.ReactNode }) {
  const shown = value === '' || value === null || value === undefined ? '—' : value;
  return (
    <div className="flex h-full items-center justify-between gap-1">
      <span className="truncate">{shown}</span>
      <span className="shrink-0 text-[var(--ink-40)]" aria-hidden="true">
        ▾
      </span>
    </div>
  );
}

export function ProductBulkGrid({
  rows,
  onRowsChange,
  manufacturers,
  salts,
  categories,
  images,
  duplicateWarnings,
}: ProductBulkGridProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Store categories first, then the canonical taxonomy — de-duped, for the
  // Category picker's <datalist>.
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const name of [...categories, ...PHARMA_CATEGORIES.map((c) => c.name)]) {
      const key = name.toLowerCase();
      if (name && !seen.has(key)) {
        seen.add(key);
        out.push(name);
      }
    }
    return out;
  }, [categories]);

  // NOTE: react-data-grid@7.0.0-beta.61 renderEditCell props use `any` to work around
  // TypeScript mismatches between the beta's declared RenderCellProps and the actual
  // API at runtime. Typecheck still passes; this is a deliberate beta-API compatibility workaround.

  const columns = useMemo<Column<BulkProductRow>[]>(() => {
    const cols: Column<BulkProductRow>[] = [
      {
        key: 'sku',
        name: 'SKU',
        width: 110,
        editable: true,
        renderEditCell: (props: any) => <TextEditor {...props} />,
      },
      {
        key: 'name',
        name: 'Name',
        width: 160,
        editable: true,
        renderEditCell: (props: any) => <TextEditor {...props} />,
      },
      {
        key: 'manufacturer',
        name: 'Manufacturer',
        width: 140,
        editable: true,
        renderCell: (props) => <PickerCell value={props.row.manufacturer} />,
        renderEditCell: (props: any) => <ManufacturerEditor {...props} />,
      },
      {
        key: 'composition',
        name: 'Composition',
        width: 210,
        editable: true,
        renderCell: (props: any) => {
          const saltStr = (props.row.salts ?? [])
            .map(
              (s: any) =>
                `${s.name} ${Number.isInteger(s.strength) ? s.strength : s.strength.toFixed(2)}${s.unit}`
            )
            .join(' + ');
          return (
            <div className="flex h-full items-center justify-between gap-1">
              <span className="truncate text-[var(--ink-70)]" title={saltStr}>
                {saltStr || '—'}
              </span>
              <span className="shrink-0 text-[var(--ink-40)]" aria-hidden="true">
                ▾
              </span>
            </div>
          );
        },
        renderEditCell: (props: any) => <CompositionEditor {...props} />,
      },
      {
        key: 'form',
        name: 'Form',
        width: 110,
        editable: true,
        renderCell: (props) => <PickerCell value={props.row.form} />,
        renderEditCell: (props: any) => (
          <SelectEditor {...props} options={DOSAGE_FORMS} />
        ),
      },
      {
        key: 'category',
        name: 'Category',
        width: 150,
        editable: true,
        renderCell: (props) => <PickerCell value={props.row.category} />,
        renderEditCell: (props: any) => <CategoryEditor {...props} />,
      },
      {
        key: 'packSize',
        name: 'Pack size',
        width: 90,
        editable: true,
        renderEditCell: (props: any) => <NumberEditor {...props} />,
      },
      {
        key: 'packUnit',
        name: 'Pack unit',
        width: 90,
        editable: true,
        renderEditCell: (props: any) => <TextEditor {...props} />,
      },
      {
        key: 'price',
        name: 'Price (₹)',
        width: 95,
        editable: true,
        renderCell: (props: any) => (
          <div className="price text-sm">
            {props.row.price?.toFixed(2)}
          </div>
        ),
        renderEditCell: (props: any) => <NumberEditor {...props} />,
      },
      {
        key: 'mrp',
        name: 'MRP (₹)',
        width: 95,
        editable: true,
        renderCell: (props: any) => (
          <div className="price text-sm">
            {props.row.mrp?.toFixed(2) || '—'}
          </div>
        ),
        renderEditCell: (props: any) => <NumberEditor {...props} />,
      },
      {
        key: 'gstRate',
        name: 'GST %',
        width: 80,
        editable: true,
        renderCell: (props) => <PickerCell value={props.row.gstRate} />,
        renderEditCell: (props: any) => (
          <SelectEditor
            {...props}
            options={GST_RATES.map((r) => String(r))}
          />
        ),
      },
      {
        key: 'stock',
        name: 'Stock',
        width: 80,
        editable: true,
        renderEditCell: (props: any) => <NumberEditor {...props} />,
      },
      {
        key: 'scheduleClass',
        name: 'Schedule',
        width: 100,
        editable: true,
        renderCell: (props) => <PickerCell value={props.row.scheduleClass} />,
        renderEditCell: (props: any) => (
          <SelectEditor {...props} options={SCHEDULE_CLASSES} />
        ),
      },
      {
        key: 'prescriptionRequired',
        name: 'Rx',
        width: 56,
        editable: true,
        renderCell: (props: any) => {
          // For H/H1/X, always show as required and disable
          const isRxSchedule = ['H', 'H1', 'X'].includes(props.row.scheduleClass);
          return (
            <input
              type="checkbox"
              checked={props.row.prescriptionRequired || isRxSchedule}
              disabled={isRxSchedule}
              readOnly
              className="h-4 w-4 cursor-pointer disabled:opacity-50"
              title={
                isRxSchedule
                  ? `Schedule ${props.row.scheduleClass} drugs always require a prescription`
                  : undefined
              }
            />
          );
        },
        renderEditCell: (props: any) => {
          const isRxSchedule = ['H', 'H1', 'X'].includes(props.row.scheduleClass);
          if (isRxSchedule) {
            return (
              <input
                type="checkbox"
                checked
                disabled
                className="h-4 w-4 cursor-not-allowed opacity-50"
                title={`Schedule ${props.row.scheduleClass} drugs always require a prescription`}
              />
            );
          }
          return <CheckboxEditor {...props} />;
        },
      },
      {
        key: 'image',
        name: 'Image',
        width: 64,
        editable: false,
        renderCell: (props) => {
          const img = props.row.image && images[props.row.image?.toUpperCase()];
          return img ? (
            <div className="h-9 w-9 relative rounded-[var(--radius-sm)] overflow-hidden">
              <Image
                src={img.url}
                alt="Product"
                fill
                className="object-cover"
                sizes="36px"
              />
            </div>
          ) : (
            <div className="text-xs text-[var(--ink-40)]">—</div>
          );
        },
      },
      {
        key: 'status',
        name: 'Status',
        width: 96,
        editable: false,
        renderCell: (props) => {
          const warning = duplicateWarnings[props.row.sku];
          if (warning) {
            return (
              <span
                className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--tint-amber-soft)] px-2 py-0.5 text-xs font-medium text-[var(--tint-amber)]"
                title={warning.message}
              >
                ⚠ Duplicate
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--mint-soft)] px-2 py-0.5 text-xs font-medium text-[var(--mint)]">
              ✓ OK
            </span>
          );
        },
      },
    ];
    return cols;
  }, [images, duplicateWarnings]);

  return (
    <div className="pm-bulk-grid">
      <DataGrid
        columns={columns}
        rows={rows}
        onRowsChange={onRowsChange}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        rowHeight={44}
        headerRowHeight={42}
        rowClass={(_row, index) => (index % 2 === 1 ? 'rdg-row--alt' : undefined)}
        style={
          {
            '--rdg-color': 'var(--ink)',
            '--rdg-border-color': 'var(--foil-soft)',
            '--rdg-background-color': 'var(--paper-card)',
            '--rdg-header-background-color': 'var(--foil-soft)',
            '--rdg-row-hover-background-color': 'var(--brand-tint)',
            '--rdg-row-selected-background-color': 'var(--brand-soft)',
            '--rdg-selection-color': 'var(--brand)',
            '--rdg-font-size': '14px',
          } as React.CSSProperties
        }
      />

      {/* Native suggestion lists shared by the in-cell pickers. Rendered once so
          they survive cell mount/unmount and (being browser-painted) escape the
          grid cell's overflow: clip. */}
      <datalist id={DL_MANUFACTURERS}>
        {manufacturers.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <datalist id={DL_CATEGORIES}>
        {categoryOptions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id={DL_SALTS}>
        {salts.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
