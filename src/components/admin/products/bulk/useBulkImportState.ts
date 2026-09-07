'use client';

import { useState, useCallback } from 'react';
import type { BulkProductRow } from '@/lib/validations/bulk-product-import';

interface RowDuplicateWarning {
  sku: string;
  message: string;
  matches: Array<{
    _id: string;
    name: string;
    manufacturer: string;
    packSize: number;
    packUnit: string;
    unitPrice: number;
    slug: string;
  }>;
}

interface ValidateResponse {
  mode: 'validate';
  totalRows: number;
  valid: number;
  willCreate: number;
  willUpdate: number;
  newCategories: string[];
  duplicateSkusInFile: string[];
  errors: Array<{ sku?: string; reason: string }>;
  duplicateWarnings?: RowDuplicateWarning[];
}

interface CommitResponse {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ sku?: string; reason: string }>;
}

const CHUNK_SIZE_WITH_IMAGES = 40;
const CHUNK_SIZE_NO_IMAGES = 100;

export function useBulkImportState() {
  const [rows, setRows] = useState<BulkProductRow[]>([]);
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{
    doneRows: number;
    totalRows: number;
    doneChunks: number;
    totalChunks: number;
  } | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<
    Record<string, RowDuplicateWarning>
  >({});

  const handleValidate = useCallback(
    async (images: Record<string, { url: string; publicId: string }>) => {
      if (rows.length === 0) {
        setError('No rows to validate');
        return;
      }

      setIsValidating(true);
      setError('');
      setValidation(null);
      setDuplicateWarnings({});

      try {
        const response = await fetch('/api/admin/products/import?mode=validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows, images }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(
            typeof data?.error === 'string'
              ? data.error
              : data?.error?.message || 'Validation failed'
          );
          return;
        }

        const result = data.data as ValidateResponse;
        setValidation(result);

        // Build a map of duplicate warnings by SKU for quick lookup in the grid
        if (result.duplicateWarnings) {
          const warningMap: Record<string, RowDuplicateWarning> = {};
          for (const warning of result.duplicateWarnings) {
            warningMap[warning.sku] = warning;
          }
          setDuplicateWarnings(warningMap);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An error occurred during validation'
        );
      } finally {
        setIsValidating(false);
      }
    },
    [rows]
  );

  const handleCommit = useCallback(
    async (images: Record<string, { url: string; publicId: string }>) => {
      if (rows.length === 0) {
        setError('No rows to commit');
        return;
      }

      if (!validation) {
        setError('Run validation first');
        return;
      }

      setIsCommitting(true);
      setError('');

      try {
        const chunkSize = Object.keys(images).length > 0
          ? CHUNK_SIZE_WITH_IMAGES
          : CHUNK_SIZE_NO_IMAGES;

        const chunks: BulkProductRow[][] = [];
        for (let i = 0; i < rows.length; i += chunkSize) {
          chunks.push(rows.slice(i, i + chunkSize));
        }

        setProgress({
          doneRows: 0,
          totalRows: rows.length,
          doneChunks: 0,
          totalChunks: chunks.length,
        });

        let totalCreated = 0;
        let totalUpdated = 0;
        let totalFailed = 0;
        const allErrors: Array<{ sku?: string; reason: string }> = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          try {
            const response = await fetch(
              '/api/admin/products/import?mode=commit',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  rows: chunk,
                  images,
                }),
              }
            );

            const data = await response.json();

            if (!response.ok) {
              const msg =
                typeof data?.error === 'string'
                  ? data.error
                  : data?.error?.message || 'Batch failed';
              setError(
                `Batch ${i + 1} of ${chunks.length} failed: ${msg} — ${totalCreated + totalUpdated} products imported so far`
              );
              setIsCommitting(false);
              setProgress(null);
              return;
            }

            const result = data.data as CommitResponse;
            totalCreated += result.created;
            totalUpdated += result.updated;
            totalFailed += result.failed;
            allErrors.push(...result.errors);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Network error';
            setError(
              `Batch ${i + 1} of ${chunks.length} failed: ${msg} — ${totalCreated + totalUpdated} products imported so far`
            );
            setIsCommitting(false);
            setProgress(null);
            return;
          }

          setProgress({
            doneRows: Math.min((i + 1) * chunkSize, rows.length),
            totalRows: rows.length,
            doneChunks: i + 1,
            totalChunks: chunks.length,
          });
        }

        // Success
        setValidation(null);
        setRows([]);
        setProgress(null);
        alert(
          `Import complete! Created: ${totalCreated}, Updated: ${totalUpdated}, Failed: ${totalFailed}`
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred during commit'
        );
      } finally {
        setIsCommitting(false);
      }
    },
    [rows, validation]
  );

  const createEmptyRow = (): BulkProductRow => ({
    sku: '',
    name: '',
    manufacturer: '',
    category: '',
    salts: [],
    form: 'tablet',
    packSize: 1,
    packUnit: 'tablet',
    price: 0,
    gstRate: 5,
    stock: 0,
    scheduleClass: 'OTC',
    prescriptionRequired: false,
    description: '',
    isActive: true,
    sideEffects: [],
    contraindications: [],
    tags: [],
  });

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()]);
  }, []);

  const addRows = useCallback((count: number) => {
    const newRows = Array.from({ length: count }, () => createEmptyRow());
    setRows((prev) => [...prev, ...newRows]);
  }, []);

  const clearRows = useCallback(() => {
    setRows([]);
    setValidation(null);
    setDuplicateWarnings({});
    setError('');
  }, []);

  return {
    rows,
    setRows,
    validation,
    isValidating,
    isCommitting,
    error,
    progress,
    duplicateWarnings,
    handleValidate,
    handleCommit,
    addRow,
    addRows,
    clearRows,
  };
}
