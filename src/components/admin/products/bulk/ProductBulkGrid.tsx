'use client';

import { DataGrid, type Column, type RenderCellProps } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { BulkProductRow } from '@/lib/validations/bulk-product-import';
import {
  TextEditor,
  NumberEditor,
  SelectEditor,
  CheckboxEditor,
  ManufacturerEditor,
  CategoryEditor,
  CompositionEditor,
} from './ProductGridEditors';

interface ProductBulkGridProps {
  rows: BulkProductRow[];
  onRowsChange: (rows: BulkProductRow[]) => void;
  manufacturers: string[];
  salts: string[];
  images: Record<string, { url: string; publicId: string }>;
  duplicateWarnings: Record<
    string,
    { sku: string; message: string; matches: any[] }
  >;
  onAddManufacturer?: (name: string) => Promise<void>;
  onAddSalt?: (name: string) => Promise<void>;
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

export function ProductBulkGrid({
  rows,
  onRowsChange,
  manufacturers,
  salts,
  images,
  duplicateWarnings,
  onAddManufacturer,
  onAddSalt,
}: ProductBulkGridProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // NOTE: react-data-grid@7.0.0-beta.61 renderEditCell props use `any` to work around
  // TypeScript mismatches between the beta's declared RenderCellProps and the actual
  // API at runtime. Typecheck still passes; this is a deliberate beta-API compatibility workaround.

  const columns = useMemo<Column<BulkProductRow>[]>(() => {
    const cols: Column<BulkProductRow>[] = [
      {
        key: 'sku',
        name: 'SKU',
        width: 100,
        editable: true,
        renderEditCell: (props: any) => <TextEditor {...props} />,
      },
      {
        key: 'name',
        name: 'Name',
        width: 150,
        editable: true,
        renderEditCell: (props: any) => <TextEditor {...props} />,
      },
      {
        key: 'manufacturer',
        name: 'Manufacturer',
        width: 120,
        editable: true,
        renderEditCell: (props: any) => (
          <ManufacturerEditor
            {...props}
            catalogManufacturers={manufacturers}
            onAddManufacturer={onAddManufacturer}
          />
        ),
      },
      {
        key: 'composition',
        name: 'Composition',
        width: 200,
        editable: true,
        renderCell: (props: any) => {
          const saltStr = (props.row.salts ?? [])
            .map(
              (s: any) =>
                `${s.name} ${Number.isInteger(s.strength) ? s.strength : s.strength.toFixed(2)}${s.unit}`
            )
            .join(' + ');
          return (
            <div className="text-sm truncate text-[var(--ink-70)]" title={saltStr}>
              {saltStr || '—'}
            </div>
          );
        },
        renderEditCell: (props: any) => (
          <CompositionEditor
            {...props}
            catalogSalts={salts}
            onAddSalt={onAddSalt}
          />
        ),
      },
      {
        key: 'form',
        name: 'Form',
        width: 100,
        editable: true,
        renderEditCell: (props: any) => (
          <SelectEditor {...props} options={DOSAGE_FORMS} />
        ),
      },
      {
        key: 'category',
        name: 'Category',
        width: 130,
        editable: true,
        renderEditCell: (props: any) => <CategoryEditor {...props} />,
      },
      {
        key: 'packSize',
        name: 'Pack Size',
        width: 90,
        editable: true,
        renderEditCell: (props: any) => <NumberEditor {...props} />,
      },
      {
        key: 'packUnit',
        name: 'Pack Unit',
        width: 80,
        editable: true,
        renderEditCell: (props: any) => <TextEditor {...props} />,
      },
      {
        key: 'price',
        name: 'Price (₹)',
        width: 90,
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
        width: 90,
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
        width: 70,
        editable: true,
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
        width: 70,
        editable: true,
        renderEditCell: (props: any) => <NumberEditor {...props} />,
      },
      {
        key: 'scheduleClass',
        name: 'Schedule',
        width: 90,
        editable: true,
        renderEditCell: (props: any) => (
          <SelectEditor {...props} options={SCHEDULE_CLASSES} />
        ),
      },
      {
        key: 'prescriptionRequired',
        name: 'Rx',
        width: 50,
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
        width: 60,
        editable: false,
        renderCell: (props) => {
          const img = props.row.image && images[props.row.image?.toUpperCase()];
          return img ? (
            <div className="h-10 w-10 relative rounded-sm overflow-hidden">
              <Image
                src={img.url}
                alt="Product"
                fill
                className="object-cover"
                sizes="40px"
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
        width: 80,
        editable: false,
        renderCell: (props) => {
          const warning = duplicateWarnings[props.row.sku];
          if (warning) {
            return (
              <div
                className="text-xs px-2 py-1 rounded-sm bg-[var(--amber-soft)] text-[var(--amber)]"
                title={warning.message}
              >
                ⚠️ Duplicate
              </div>
            );
          }
          return (
            <div className="text-xs px-2 py-1 rounded-sm bg-[var(--brand-soft)] text-[var(--brand)]">
              ✓ OK
            </div>
          );
        },
      },
    ];
    return cols;
  }, [manufacturers, salts, images, duplicateWarnings, onAddManufacturer, onAddSalt]);

  return (
    <div className="overflow-x-auto border border-[var(--foil-soft)] rounded-[var(--radius-sm)]">
      <DataGrid
        columns={columns}
        rows={rows}
        onRowsChange={onRowsChange}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        className="fill-grid"
        style={{
          '--rdg-header-background': 'var(--foil-soft)',
          '--rdg-header-font-weight': '500',
          '--rdg-header-font-size': '0.75rem',
          '--rdg-header-text-color': 'var(--ink-70)',
          '--rdg-selection-color': 'var(--brand-soft)',
          '--rdg-row-hover-background': 'var(--foil-soft)',
        } as any}
      />
    </div>
  );
}
