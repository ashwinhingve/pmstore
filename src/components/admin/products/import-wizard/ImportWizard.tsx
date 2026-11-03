'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, RotateCcw,
  ArrowRight, ArrowLeft, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/store/useToastStore';
import { PHARMA_CATEGORIES } from '@/lib/categories';
import { parseCsv } from '@/lib/import/csv-parse';
import { fileToCsv } from '@/lib/import/file-to-csv';
import { detectColumns } from '@/lib/import/column-detect';
import {
  toWorkingRows, validateRows, rowsWithErrors, workingRowsToCsv, sampleCsv, errorReportCsv,
  type WorkingRow,
} from '@/lib/import/wizard-row';
import { EditablePreviewTable, type PreviewDatalists } from './EditablePreviewTable';
import { ColumnMatchStep } from './ColumnMatchStep';

type Step = 'upload' | 'match' | 'review' | 'confirm' | 'results';
type DuplicateMode = 'skip' | 'update';

interface ValidateResult {
  totalRows: number;
  valid: number;
  willCreate: number;
  willUpdate: number;
  willSkip?: number;
  newCategories: string[];
  duplicateSkusInFile: string[];
  errors: { sku?: string; reason: string }[];
}
interface CommitResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { sku?: string; reason: string }[];
}

const DRAFT_KEY = 'pmstore-import-draft';
const DRAFT_MAX_BYTES = 4_500_000; // ~4.5MB — stay under the ~5MB localStorage ceiling
const COMMIT_CHUNK = 80;

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'match', label: 'Match columns' },
  { key: 'review', label: 'Review & fix' },
  { key: 'confirm', label: 'Confirm' },
  { key: 'results', label: 'Done' },
];

interface DraftShape {
  step: Step;
  fileName: string;
  rawHeaders: string[];
  rawRows: Record<string, string>[];
  mapping: Record<string, string | null>;
  rows: WorkingRow[];
  onDuplicate: DuplicateMode;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function ImportWizard() {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [rows, setRows] = useState<WorkingRow[]>([]);
  const [onDuplicate, setOnDuplicate] = useState<DuplicateMode>('update');

  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const [datalists, setDatalists] = useState<PreviewDatalists>({
    manufacturers: [],
    categories: PHARMA_CATEGORIES.map((c) => c.name),
    salts: [],
  });

  const [restored, setRestored] = useState(false);
  const [cantPersist, setCantPersist] = useState(false);
  const hydrated = useRef(false);

  // ---- Draft persistence ------------------------------------------------
  // Restore an in-progress import so leaving the page and coming back (or a
  // reload) doesn't lose the admin's work. Admin catalogue data only — no PII.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as DraftShape;
        if (d && Array.isArray(d.rows) && (d.rows.length > 0 || d.rawRows?.length > 0)) {
          setStep(d.step ?? 'upload');
          setFileName(d.fileName ?? '');
          setRawHeaders(d.rawHeaders ?? []);
          setRawRows(d.rawRows ?? []);
          setMapping(d.mapping ?? {});
          setRows(d.rows ?? []);
          setOnDuplicate(d.onDuplicate === 'skip' ? 'skip' : 'update');
          if (d.step !== 'results') setRestored(true);
        }
      }
    } catch {
      /* ignore a corrupt draft */
    }
    hydrated.current = true;
  }, []);

  // Debounced save of the working draft.
  useEffect(() => {
    if (!hydrated.current) return;
    if (step === 'results' || (rows.length === 0 && rawRows.length === 0)) return;
    const id = setTimeout(() => {
      try {
        const draft: DraftShape = { step, fileName, rawHeaders, rawRows, mapping, rows, onDuplicate };
        const serialized = JSON.stringify(draft);
        if (serialized.length > DRAFT_MAX_BYTES) {
          setCantPersist(true);
          return;
        }
        setCantPersist(false);
        localStorage.setItem(DRAFT_KEY, serialized);
      } catch {
        setCantPersist(true);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [step, fileName, rawHeaders, rawRows, mapping, rows, onDuplicate]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // ---- Reference data for the preview datalists -------------------------
  useEffect(() => {
    fetch('/api/admin/products/manufacturers')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.manufacturers)) {
          setDatalists((prev) => ({ ...prev, manufacturers: d.manufacturers }));
        }
      })
      .catch(() => {});
    fetch('/api/admin/products/salts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.salts)) setDatalists((prev) => ({ ...prev, salts: d.salts }));
      })
      .catch(() => {});
  }, []);

  // ---- Client-side validation (drives inline highlights) ----------------
  const issues = useMemo(() => validateRows(rows), [rows]);
  const errorRows = useMemo(() => rowsWithErrors(issues), [issues]);
  const errorList = useMemo(
    () => issues.filter((i) => i.severity === 'error').slice(0, 100),
    [issues],
  );
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  // ---- File handling ----------------------------------------------------
  const handleFile = useCallback(async (file: File) => {
    try {
      const csv = await fileToCsv(file);
      const parsed = parseCsv(csv);
      if (parsed.length === 0) {
        toast.error('That file has no data rows. Check it and try again.');
        return;
      }
      const headers = Object.keys(parsed[0]);
      const detected = detectColumns(headers);
      setFileName(file.name);
      setRawHeaders(headers);
      setRawRows(parsed);
      setMapping(detected);
      setRows(toWorkingRows(parsed, detected));
      setValidateResult(null);
      setCommitResult(null);
      setRestored(false);
      setStep('match');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file.');
    }
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) handleFile(accepted[0]);
    },
    [handleFile],
  );
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  // ---- Step actions -----------------------------------------------------
  const applyMappingAndContinue = () => {
    setRows(toWorkingRows(rawRows, mapping));
    setStep('review');
  };

  const editCell = (rowIndex: number, field: string, value: string) => {
    setRows((prev) => {
      const next = prev.slice();
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });
  };

  const runValidate = useCallback(
    async (mode: DuplicateMode): Promise<ValidateResult | null> => {
      setValidating(true);
      try {
        const csv = workingRowsToCsv(rows);
        const res = await fetch(`/api/admin/products/import?mode=validate&onDuplicate=${mode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: csv,
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || 'Could not check the file. Try again.');
          return null;
        }
        return json.data as ValidateResult;
      } catch {
        toast.error('Could not reach the server to check the file.');
        return null;
      } finally {
        setValidating(false);
      }
    },
    [rows],
  );

  const goToConfirm = async () => {
    const result = await runValidate(onDuplicate);
    if (result) {
      setValidateResult(result);
      setStep('confirm');
    }
  };

  const changeDuplicateMode = async (mode: DuplicateMode) => {
    setOnDuplicate(mode);
    const result = await runValidate(mode);
    if (result) setValidateResult(result);
  };

  const runImport = async () => {
    setImporting(true);
    const batches = chunk(rows, COMMIT_CHUNK);
    setProgress({ done: 0, total: batches.length });
    const agg: CommitResult = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

    for (let i = 0; i < batches.length; i++) {
      try {
        const csv = workingRowsToCsv(batches[i]);
        const res = await fetch(`/api/admin/products/import?mode=commit&onDuplicate=${onDuplicate}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: csv,
        });
        const json = await res.json();
        if (!res.ok) {
          agg.failed += batches[i].length;
          agg.errors.push({ reason: json.error || 'This batch could not be saved.' });
        } else {
          const d = json.data;
          agg.created += d.created || 0;
          agg.updated += d.updated || 0;
          agg.skipped += d.skipped || 0;
          agg.failed += d.failed || 0;
          if (Array.isArray(d.errors)) agg.errors.push(...d.errors);
        }
      } catch {
        agg.failed += batches[i].length;
        agg.errors.push({ reason: 'This batch could not be saved (network error).' });
      }
      setProgress({ done: i + 1, total: batches.length });
    }

    setCommitResult(agg);
    clearDraft();
    setImporting(false);
    setStep('results');
  };

  const startOver = () => {
    clearDraft();
    setStep('upload');
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setMapping({});
    setRows([]);
    setOnDuplicate('update');
    setValidateResult(null);
    setCommitResult(null);
    setRestored(false);
    setCantPersist(false);
  };

  const requiredUnmapped = useMemo(
    () =>
      ['sku', 'name', 'manufacturer', 'category', 'form', 'price', 'pack_size'].filter(
        (k) => !mapping[k],
      ),
    [mapping],
  );

  // ---- Render -----------------------------------------------------------
  return (
    <div className="space-y-6">
      <Stepper current={step} />

      {restored && step !== 'results' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--brand)]/40 bg-[var(--brand-soft)] px-4 py-3">
          <p className="text-sm text-[var(--ink)]">
            Picked up your in-progress import{fileName ? ` of “${fileName}”` : ''}.
          </p>
          <button
            type="button"
            onClick={startOver}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand)] hover:underline"
          >
            <RotateCcw className="h-4 w-4" /> Start over
          </button>
        </div>
      )}

      {cantPersist && step !== 'results' && (
        <p className="flex items-center gap-2 text-xs text-[var(--tint-amber)]">
          <AlertTriangle className="h-4 w-4" />
          This file is large, so it won’t be saved if you reload the page. Finish the import in one go.
        </p>
      )}

      {step === 'upload' && (
        <section className="space-y-4">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-16 text-center transition-colors ${
              isDragActive
                ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                : 'border-[var(--foil)] bg-[var(--paper-card)]'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mb-3 h-10 w-10 text-[var(--ink-40)]" aria-hidden="true" />
            <p className="text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
              Drag a CSV or Excel file here
            </p>
            <p className="mt-1 text-sm text-[var(--ink-70)]">
              or choose one from your computer. Accepts .csv and .xlsx files.
            </p>
            <Button type="button" onClick={open} className="mt-5 bg-[var(--brand)] text-[var(--brand-ink)]">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Choose a file
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-tint)] px-4 py-3">
            <div className="text-sm text-[var(--ink-70)]">
              <p className="font-medium text-[var(--ink)]">Not sure how to format your file?</p>
              <p>Download the sample. It has the right headings and two example products.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadCsv('pmstore-import-sample.csv', sampleCsv())}
            >
              <Download className="mr-2 h-4 w-4" /> Download sample
            </Button>
          </div>
        </section>
      )}

      {step === 'match' && (
        <section className="space-y-5">
          <ColumnMatchStep
            rawHeaders={rawHeaders}
            sampleRow={rawRows[0]}
            mapping={mapping}
            onChange={(field, header) => setMapping((prev) => ({ ...prev, [field]: header }))}
          />
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={startOver}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Choose another file
            </Button>
            <Button
              type="button"
              onClick={applyMappingAndContinue}
              className="bg-[var(--brand)] text-[var(--brand-ink)]"
              disabled={requiredUnmapped.length > 0}
            >
              Continue to preview <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          {requiredUnmapped.length > 0 && (
            <p className="text-right text-xs text-[var(--tint-amber)]">
              Map every required field (*) to continue.
            </p>
          )}
        </section>
      )}

      {step === 'review' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--ink-70)]">
              <span className="font-semibold text-[var(--ink)]">{rows.length}</span> product
              {rows.length === 1 ? '' : 's'} ready.{' '}
              {errorRows.size > 0 ? (
                <span className="font-medium text-[var(--tint-amber)]">
                  {errorRows.size} row{errorRows.size === 1 ? '' : 's'} need fixing.
                </span>
              ) : (
                <span className="font-medium text-[var(--mint)]">No problems found.</span>
              )}
              {warningCount > 0 && (
                <span className="ml-1 text-[var(--ink-70)]">{warningCount} note{warningCount === 1 ? '' : 's'}.</span>
              )}
            </p>
            <p className="text-xs text-[var(--ink-40)]">Click any cell to edit it.</p>
          </div>

          {errorList.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-[var(--tint-amber)]/50 bg-[var(--tint-amber-soft)]/50 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)]">
                <AlertTriangle className="h-4 w-4 text-[var(--tint-amber)]" /> Please fix these
              </p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-sm text-[var(--ink-70)]">
                {errorList.map((it, idx) => (
                  <li key={idx}>
                    {it.message} <span className="text-[var(--ink-40)]">in Row {it.row + 1}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <EditablePreviewTable rows={rows} issues={issues} datalists={datalists} onEdit={editCell} />

          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => setStep('match')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to columns
            </Button>
            <Button
              type="button"
              onClick={goToConfirm}
              className="bg-[var(--brand)] text-[var(--brand-ink)]"
              loading={validating}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === 'confirm' && validateResult && (
        <section className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="New products" value={validateResult.willCreate} tone="mint" />
            <SummaryTile
              label={onDuplicate === 'skip' ? 'Skipped (exist)' : 'Updated (exist)'}
              value={onDuplicate === 'skip' ? validateResult.willSkip ?? 0 : validateResult.willUpdate}
            />
            <SummaryTile label="Rows with errors" value={validateResult.errors.length} tone={validateResult.errors.length ? 'amber' : undefined} />
            <SummaryTile label="Total rows" value={validateResult.totalRows} />
          </div>

          <fieldset className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--ink)]">
              When a product already exists (matched by SKU)
            </legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-2 text-sm text-[var(--ink)]">
                <input
                  type="radio"
                  name="onDuplicate"
                  checked={onDuplicate === 'update'}
                  onChange={() => changeDuplicateMode('update')}
                  className="mt-0.5 accent-[var(--brand)]"
                />
                <span>
                  <span className="font-medium">Update it</span> — overwrite the existing product with
                  the details in this file.
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-[var(--ink)]">
                <input
                  type="radio"
                  name="onDuplicate"
                  checked={onDuplicate === 'skip'}
                  onChange={() => changeDuplicateMode('skip')}
                  className="mt-0.5 accent-[var(--brand)]"
                />
                <span>
                  <span className="font-medium">Skip it</span> — keep the existing product unchanged and
                  only add new ones.
                </span>
              </label>
            </div>
          </fieldset>

          {validateResult.newCategories.length > 0 && (
            <p className="text-sm text-[var(--ink-70)]">
              New categories that will be created:{' '}
              <span className="font-medium text-[var(--ink)]">{validateResult.newCategories.join(', ')}</span>
            </p>
          )}
          {validateResult.duplicateSkusInFile.length > 0 && (
            <p className="flex items-start gap-2 text-sm text-[var(--tint-amber)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Some SKUs appear more than once in your file and will collapse to one product:{' '}
              {validateResult.duplicateSkusInFile.join(', ')}
            </p>
          )}
          {validateResult.errors.length > 0 && (
            <p className="text-sm text-[var(--ink-70)]">
              {validateResult.errors.length} row{validateResult.errors.length === 1 ? '' : 's'} will be
              skipped because of errors. You can go back to fix them, or import the rest.
            </p>
          )}

          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => setStep('review')} disabled={importing}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to review
            </Button>
            <Button
              type="button"
              onClick={runImport}
              className="bg-[var(--brand)] text-[var(--brand-ink)]"
              loading={importing}
              disabled={validateResult.willCreate + (onDuplicate === 'update' ? validateResult.willUpdate : 0) === 0}
            >
              Import {validateResult.willCreate + (onDuplicate === 'update' ? validateResult.willUpdate : 0)} product
              {validateResult.willCreate + (onDuplicate === 'update' ? validateResult.willUpdate : 0) === 1 ? '' : 's'}
            </Button>
          </div>

          {importing && progress.total > 0 && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--foil-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--brand)] transition-all"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-[var(--ink-70)]">
                <Loader2 className="h-3 w-3 animate-spin" /> Importing… batch {progress.done} of {progress.total}
              </p>
            </div>
          )}
        </section>
      )}

      {step === 'results' && commitResult && (
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-[var(--mint)]" />
            <h2 className="text-[length:var(--step-1)] font-semibold text-[var(--ink)]">Import finished</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Created" value={commitResult.created} tone="mint" />
            <SummaryTile label="Updated" value={commitResult.updated} />
            <SummaryTile label="Skipped" value={commitResult.skipped} />
            <SummaryTile label="Failed" value={commitResult.failed} tone={commitResult.failed ? 'amber' : undefined} />
          </div>

          {commitResult.errors.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-[var(--tint-amber)]/50 bg-[var(--tint-amber-soft)]/40 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)]">
                  <AlertTriangle className="h-4 w-4 text-[var(--tint-amber)]" /> Some rows didn’t import
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv('import-errors.csv', errorReportCsv(commitResult.errors))}
                >
                  <Download className="mr-2 h-4 w-4" /> Download error report
                </Button>
              </div>
              <ul className="max-h-48 space-y-0.5 overflow-y-auto text-sm text-[var(--ink-70)]">
                {commitResult.errors.slice(0, 50).map((e, idx) => (
                  <li key={idx}>
                    {e.sku ? <span className="font-medium text-[var(--ink)]">{e.sku}: </span> : null}
                    {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={startOver} className="bg-[var(--brand)] text-[var(--brand-ink)]">
              Import another file
            </Button>
            <Link
              href="/admin/products"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--foil)] px-4 text-sm font-medium text-[var(--ink)] hover:bg-[var(--foil-soft)]"
            >
              View products
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {STEPS.map((s, i) => {
        const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'todo';
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                state === 'done'
                  ? 'bg-[var(--mint)] text-[var(--paper-card)]'
                  : state === 'current'
                    ? 'bg-[var(--brand)] text-[var(--brand-ink)]'
                    : 'bg-[var(--foil-soft)] text-[var(--ink-40)]'
              }`}
            >
              {state === 'done' ? '✓' : i + 1}
            </span>
            <span className={state === 'todo' ? 'text-[var(--ink-40)]' : 'text-[var(--ink)]'}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 text-[var(--foil)]">—</span>}
          </li>
        );
      })}
    </ol>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'mint' | 'amber';
}) {
  const valueColor =
    tone === 'mint' ? 'text-[var(--mint)]' : tone === 'amber' ? 'text-[var(--tint-amber)]' : 'text-[var(--ink)]';
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-3 text-center">
      <p className={`text-[length:var(--step-2)] font-bold tabular-nums ${valueColor}`} style={{ fontFamily: 'var(--font-data)' }}>
        {value}
      </p>
      <p className="text-xs text-[var(--ink-70)]">{label}</p>
    </div>
  );
}
