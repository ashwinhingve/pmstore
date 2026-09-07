'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/store/useToastStore';
import { ProductBulkGrid } from './ProductBulkGrid';
import { BulkImportToolbar } from './BulkImportToolbar';
import { ImageMatchingPanel } from './ImageMatchingPanel';
import { useBulkImportState } from './useBulkImportState';

interface Stat {
  label: string;
  value: number;
  tone: 'mint' | 'ink';
}

function Stat({ label, value, tone }: Stat) {
  const bgClass = tone === 'mint' ? 'bg-[var(--brand-soft)]' : 'bg-[var(--foil-soft)]';
  const textClass = tone === 'mint' ? 'text-[var(--brand)]' : 'text-[var(--ink-70)]';
  return (
    <div className={`${bgClass} rounded-[var(--radius-sm)] p-3`}>
      <div className={`text-xs font-medium ${textClass}`}>{label}</div>
      <div className={`text-lg font-semibold ${textClass}`}>{value}</div>
    </div>
  );
}

export function ProductBulkImportClient() {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [salts, setSalts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [images, setImages] = useState<Record<string, { url: string; publicId: string }>>({});

  const {
    rows,
    setRows,
    validation,
    isValidating,
    isCommitting,
    error,
    successMessage,
    progress,
    duplicateWarnings,
    handleValidate,
    handleCommit,
    addRow,
    addRows,
    clearRows,
  } = useBulkImportState();

  // Fetch the manufacturer / salt / category catalogues on mount so the grid's
  // pickers have something to suggest. The endpoints return { manufacturers },
  // { salts } and { categories } respectively.
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/products/manufacturers')
        .then((r) => r.json())
        .then((d) => setManufacturers(Array.isArray(d.manufacturers) ? d.manufacturers : []))
        .catch(() => {}),
      fetch('/api/admin/products/salts')
        .then((r) => r.json())
        .then((d) => setSalts(Array.isArray(d.salts) ? d.salts : []))
        .catch(() => {}),
      fetch('/api/admin/categories')
        .then((r) => r.json())
        .then((d) =>
          setCategories(
            Array.isArray(d.categories) ? d.categories.map((c: { name: string }) => c.name) : []
          )
        )
        .catch(() => {}),
    ]);
  }, []);

  // Show success toast when import completes
  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
    }
  }, [successMessage]);

  const progressPct = progress
    ? Math.round((progress.doneRows / Math.max(progress.totalRows, 1)) * 100)
    : 0;

  const skus = rows.map((r) => r.sku).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <BulkImportToolbar
        onAddRow={addRow}
        onAddRows={addRows}
        onFileSelected={(bulkRows) => {
          setRows(bulkRows);
          setImages({});
        }}
        onValidate={() => handleValidate(images)}
        onCommit={() => handleCommit(images)}
        rowCount={rows.length}
        isValidating={isValidating}
        isCommitting={isCommitting}
        hasValidation={validation !== null}
      />

      {/* Image upload panel */}
      <ImageMatchingPanel
        skus={skus}
        onImagesMatched={(imgs) => setImages(imgs)}
      />

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-[var(--ink)]"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {/* Progress bar */}
      {progress && (
        <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-[var(--ink)]">
              Importing… {progress.doneRows}/{progress.totalRows} rows (
              {progress.doneChunks}/{progress.totalChunks} batches)
            </span>
            <span
              className="data text-[var(--ink-70)]"
              style={{ fontFamily: 'var(--font-data)' }}
            >
              {progressPct}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--foil-soft)]">
            <div
              className="h-full bg-[var(--brand)] transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Validation results */}
      {validation && !progress && (
        <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--brand)]" aria-hidden="true" />
            <h3 className="font-semibold text-[var(--ink)]">
              Preview — nothing has been imported yet
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Valid rows" value={validation.valid} tone="mint" />
            <Stat
              label="New products"
              value={validation.willCreate}
              tone="mint"
            />
            <Stat
              label="Existing products"
              value={validation.willUpdate}
              tone="mint"
            />
            <Stat
              label="Errors"
              value={validation.totalRows - validation.valid}
              tone="ink"
            />
          </div>

          {validation.duplicateSkusInFile.length > 0 && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                {validation.duplicateSkusInFile.length} SKU
                {validation.duplicateSkusInFile.length === 1 ? '' : 's'}{' '}
                {validation.duplicateSkusInFile.length === 1 ? 'appears' : 'appear'}{' '}
                more than once in this file — only the last row for each will be
                imported:{' '}
                <span style={{ fontFamily: 'var(--font-data)' }}>
                  {validation.duplicateSkusInFile.join(', ')}
                </span>
              </p>
            </div>
          )}

          {validation.newCategories.length > 0 && (
            <p className="text-sm text-[var(--ink-70)]">
              New categories that will be created: {validation.newCategories.join(', ')}
            </p>
          )}

          {validation.errors.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[var(--ink-70)]">
                {validation.totalRows - validation.valid > validation.errors.length
                  ? `First ${validation.errors.length} of ${
                      validation.totalRows - validation.valid
                    } rows with errors`
                  : `${validation.errors.length} row${
                      validation.errors.length === 1 ? '' : 's'
                    } with errors`}
              </h4>
              <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--foil-soft)]">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="bg-[var(--foil-soft)] text-xs uppercase tracking-wide text-[var(--ink-70)]">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">
                        SKU
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.errors.map((e, i) => (
                      <tr key={i} className="border-t border-[var(--foil-soft)]">
                        <td
                          className="px-4 py-2 text-[var(--ink)]"
                          style={{ fontFamily: 'var(--font-data)' }}
                        >
                          {e.sku || '—'}
                        </td>
                        <td className="px-4 py-2 text-[var(--ink-70)]">
                          {e.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {rows.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-medium text-[var(--ink)]">
              {rows.length} product{rows.length === 1 ? '' : 's'}
            </h3>
            <div className="flex items-center gap-3">
              <p className="text-xs text-[var(--ink-40)]">Double-click a cell to edit</p>
              <button
                onClick={clearRows}
                className="text-xs font-medium text-[var(--ink-70)] hover:text-[var(--ink)]"
                type="button"
              >
                Clear all
              </button>
            </div>
          </div>
          <ProductBulkGrid
            rows={rows}
            onRowsChange={setRows}
            manufacturers={manufacturers}
            salts={salts}
            categories={categories}
            images={images}
            duplicateWarnings={duplicateWarnings}
          />
        </div>
      )}

      {/* Empty state — nothing to show until there are rows */}
      {rows.length === 0 && !progress && (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--foil)] bg-[var(--paper-card)] px-6 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)]">
            <Table2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--ink)]">No products yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--ink-70)]">
            Add rows and fill them in, or drag a CSV / Excel file into the bar above. Existing
            products are matched by SKU.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" size="sm" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" /> Add a row
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addRows(10)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add 10 rows
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
