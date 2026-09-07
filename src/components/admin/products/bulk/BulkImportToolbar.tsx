'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, Upload, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/store/useToastStore';
import type { BulkProductRow } from '@/lib/validations/bulk-product-import';
import { parseCsv } from '@/lib/import/csv-parse';

interface BulkImportToolbarProps {
  onAddRow: () => void;
  onAddRows: (count: number) => void;
  onFileSelected: (rows: BulkProductRow[]) => void;
  onValidate: () => Promise<void>;
  onCommit: () => Promise<void>;
  rowCount: number;
  isValidating: boolean;
  isCommitting: boolean;
  hasValidation: boolean;
}

/**
 * Read a CSV file directly, or convert the first sheet of an Excel file to CSV.
 * Reused from ProductImportClient.tsx
 */
async function fileToCsv(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv')
    return file.text();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const first = wb.SheetNames[0];
    if (!first) throw new Error('That spreadsheet has no sheets.');
    return XLSX.utils.sheet_to_csv(wb.Sheets[first]);
  }
  throw new Error('Unsupported file. Upload a .csv or .xlsx file.');
}

/**
 * Convert CSV rows to BulkProductRow format.
 * Assumes canonical columns are already present or mapped.
 */
function csvRowsToBulkProductRows(csvRows: Record<string, string>[]): BulkProductRow[] {
  return csvRows.map((row) => {
    // Parse salts from salt_1_*, salt_2_* columns
    const salts = [];
    for (let i = 1; ; i++) {
      const name = (row[`salt_${i}_name`] || '').trim();
      const strength = parseFloat(row[`salt_${i}_strength`] || '0');
      const unit = (row[`salt_${i}_unit`] || 'mg').trim() as any;

      if (!name && !strength && !unit) {
        if (!(`salt_${i + 1}_name` in row)) break;
        continue;
      }

      if (name) {
        salts.push({ name, strength, unit });
      }
    }

    return {
      sku: (row.sku || '').trim(),
      name: (row.name || '').trim(),
      brand: (row.brand || '').trim() || undefined,
      manufacturer: (row.manufacturer || '').trim(),
      category: (row.category || '').trim(),
      salts,
      form: (row.form || 'tablet').trim() as any,
      packSize: parseInt(row.packSize || '1', 10),
      packUnit: (row.packUnit || 'tablet').trim(),
      price: parseFloat(row.price || '0'),
      mrp: row.mrp ? parseFloat(row.mrp) : undefined,
      gstRate: parseInt(row.gstRate || '5', 10) as any,
      stock: parseInt(row.stock || '0', 10),
      scheduleClass: (row.scheduleClass || 'OTC').trim() as any,
      prescriptionRequired:
        (row.prescriptionRequired || '').toLowerCase() === 'true',
      description: (row.description || '').trim(),
      hsnCode: (row.hsnCode || '').trim() || undefined,
      storageInstructions: (row.storageInstructions || '').trim() || undefined,
      usageInstructions: (row.usageInstructions || '').trim() || undefined,
      sideEffects: (row.sideEffects || '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean),
      contraindications: (row.contraindications || '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean),
      tags: (row.tags || '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean),
      isActive: (row.isActive || 'true').toLowerCase() !== 'false',
    };
  });
}

export function BulkImportToolbar({
  onAddRow,
  onAddRows,
  onFileSelected,
  onValidate,
  onCommit,
  rowCount,
  isValidating,
  isCommitting,
  hasValidation,
}: BulkImportToolbarProps) {
  const [showAddCount, setShowAddCount] = useState(false);
  const [addCount, setAddCount] = useState(10);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        if (!acceptedFiles[0]) return;
        const csv = await fileToCsv(acceptedFiles[0]);
        const csvRows = parseCsv(csv);
        const bulkRows = csvRowsToBulkProductRows(csvRows);
        onFileSelected(bulkRows);
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error(
          error instanceof Error ? error.message : 'Could not read file'
        );
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'application/vnd.ms-excel': ['.xls'],
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-[var(--paper)] rounded-[var(--radius-sm)] border border-[var(--foil-soft)]">
      <Button
        onClick={onAddRow}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Plus className="h-4 w-4" /> Add row
      </Button>

      <div className="relative">
        <Button
          onClick={() => setShowAddCount(!showAddCount)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Add {addCount} rows
        </Button>
        {showAddCount && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-[var(--paper)] border border-[var(--foil-soft)] rounded-sm shadow-sm z-10">
            <input
              type="number"
              min="1"
              max="1000"
              value={addCount}
              onChange={(e) => setAddCount(Math.max(1, parseInt(e.target.value) || 10))}
              className="w-16 h-8 px-2 text-sm border border-[var(--foil-soft)] rounded-sm"
              placeholder="Count"
              autoFocus
            />
            <Button
              onClick={() => {
                onAddRows(addCount);
                setShowAddCount(false);
              }}
              size="sm"
              className="ml-2 gap-2"
            >
              Add
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div
        {...getRootProps()}
        className={`flex-1 max-w-xs p-2 border-2 border-dashed rounded-sm text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
            : 'border-[var(--foil)] hover:border-[var(--foil-soft)]'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex items-center justify-center gap-1 text-xs text-[var(--ink-70)]">
          <Upload className="h-3 w-3" />
          {isDragActive ? 'Drop here' : 'Drag CSV/XLSX or click'}
        </div>
      </div>

      <Button
        onClick={onValidate}
        disabled={rowCount === 0 || isValidating || isCommitting}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
        Preview
      </Button>

      <Button
        onClick={onCommit}
        disabled={!hasValidation || isCommitting || isValidating}
        title={!hasValidation ? 'Run Preview first' : undefined}
        className="gap-2"
      >
        {isCommitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Commit
      </Button>
    </div>
  );
}
