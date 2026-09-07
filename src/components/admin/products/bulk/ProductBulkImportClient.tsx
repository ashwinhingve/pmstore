'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

  // Fetch manufacturers and salts on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/products/manufacturers')
        .then((r) => r.json())
        .then((d) => setManufacturers(d.data?.map((m: any) => m.name) || []))
        .catch(() => {}),
      fetch('/api/admin/products/salts')
        .then((r) => r.json())
        .then((d) => setSalts(d.data?.map((s: any) => s.name) || []))
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
        <div className="rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] p-4">
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
        <div className="space-y-4 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] p-4">
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
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--ink)]">
              {rows.length} product{rows.length === 1 ? '' : 's'}
            </h3>
            <button
              onClick={clearRows}
              className="text-xs text-[var(--ink-40)] hover:text-[var(--ink)]"
              type="button"
            >
              Clear all
            </button>
          </div>
          <ProductBulkGrid
            rows={rows}
            onRowsChange={setRows}
            manufacturers={manufacturers}
            salts={salts}
            images={images}
            duplicateWarnings={duplicateWarnings}
            onAddManufacturer={async (name) => {
              try {
                const res = await fetch('/api/admin/products/manufacturers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name }),
                });
                if (res.ok) {
                  setManufacturers((prev) => [...new Set([...prev, name])]);
                }
              } catch (err) {
                console.error('Failed to add manufacturer:', err);
              }
            }}
            onAddSalt={async (name) => {
              try {
                const res = await fetch('/api/admin/products/salts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name }),
                });
                if (res.ok) {
                  setSalts((prev) => [...new Set([...prev, name])]);
                }
              } catch (err) {
                console.error('Failed to add salt:', err);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
