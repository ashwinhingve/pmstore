'use client';

import { useState } from 'react';
import { CANONICAL_FIELDS } from '@/lib/import/column-detect';
import type { WorkingRow, RowIssue } from '@/lib/import/wizard-row';

/** Dosage forms the importer accepts (mirrors product-row.ts). */
const FORMS = [
  'tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment',
  'gel', 'drops', 'inhaler', 'powder', 'sachet', 'spray', 'patch', 'other',
];
const SCHEDULES = ['OTC', 'G', 'H', 'H1', 'X'];
const YES_NO = ['yes', 'no'];

/** Which editor each field uses. Anything not listed is a plain text input. */
const SELECT_OPTIONS: Record<string, string[]> = {
  form: FORMS,
  schedule_class: SCHEDULES,
  prescription_required: YES_NO,
  is_active: YES_NO,
};
const DATALIST_FIELDS: Record<string, 'manufacturers' | 'categories' | 'salts'> = {
  manufacturer: 'manufacturers',
  category: 'categories',
};

export interface PreviewDatalists {
  manufacturers: string[];
  categories: string[];
  salts: string[];
}

/**
 * Single-click editable preview of the rows about to be imported.
 *
 * Click any cell to edit it (one click — no double-click like the old grid).
 * Cells with a validation error are tinted amber (never red — on a pharmacy red
 * means "needs a doctor", root CLAUDE.md rule #7). Dropdowns/datalists keep the
 * fixed-vocabulary fields (form, schedule, manufacturer, category) honest.
 */
export function EditablePreviewTable({
  rows,
  issues,
  datalists,
  onEdit,
}: {
  rows: WorkingRow[];
  issues: RowIssue[];
  datalists: PreviewDatalists;
  onEdit: (rowIndex: number, field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState<{ row: number; field: string } | null>(null);

  // Index issues by "row:field" for O(1) cell lookups.
  const issueByCell = new Map<string, RowIssue>();
  for (const it of issues) {
    const key = `${it.row}:${it.field}`;
    // An error outranks a warning for the same cell.
    if (!issueByCell.has(key) || it.severity === 'error') issueByCell.set(key, it);
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--foil-soft)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--paper-tint)]">
            <th className="sticky left-0 z-10 border-b border-r border-[var(--foil-soft)] bg-[var(--paper-tint)] px-3 py-2 text-left text-xs font-semibold text-[var(--ink-70)]">
              Row
            </th>
            {CANONICAL_FIELDS.map((f) => (
              <th
                key={f.key}
                className="whitespace-nowrap border-b border-[var(--foil-soft)] px-3 py-2 text-left text-xs font-semibold text-[var(--ink-70)]"
              >
                {f.label}
                {f.required && <span className="ml-0.5 text-[var(--tint-amber)]" title="Required">*</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-[var(--paper-card)] even:bg-[var(--paper)]">
              <td className="sticky left-0 z-10 border-b border-r border-[var(--foil-soft)] bg-inherit px-3 py-1.5 text-xs tabular-nums text-[var(--ink-40)]">
                {rowIndex + 1}
              </td>
              {CANONICAL_FIELDS.map((f) => {
                const isEditing = editing?.row === rowIndex && editing?.field === f.key;
                const issue = issueByCell.get(`${rowIndex}:${f.key}`);
                const tint =
                  issue?.severity === 'error'
                    ? 'bg-[var(--tint-amber-soft)] ring-1 ring-inset ring-[var(--tint-amber)]'
                    : issue?.severity === 'warning'
                      ? 'bg-[var(--tint-amber-soft)]/40'
                      : '';
                return (
                  <td
                    key={f.key}
                    className={`border-b border-[var(--foil-soft)] px-1 py-1 align-top ${tint}`}
                    title={issue ? issue.message : undefined}
                  >
                    {isEditing ? (
                      <CellEditor
                        field={f.key}
                        value={row[f.key] ?? ''}
                        datalists={datalists}
                        onCommit={(v) => {
                          onEdit(rowIndex, f.key, v);
                          setEditing(null);
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing({ row: rowIndex, field: f.key })}
                        className="flex min-h-8 w-full min-w-[7rem] max-w-[16rem] items-center truncate rounded px-2 py-1 text-left text-[var(--ink)] hover:bg-[var(--foil-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
                      >
                        <span className={row[f.key] ? 'truncate' : 'text-[var(--ink-40)]'}>
                          {row[f.key] || (f.required ? 'Required' : '—')}
                        </span>
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The input/select/datalist shown when a cell is being edited. */
function CellEditor({
  field,
  value,
  datalists,
  onCommit,
  onCancel,
}: {
  field: string;
  value: string;
  datalists: PreviewDatalists;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const commit = () => onCommit(draft.trim());

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') onCancel();
  };

  const base =
    'w-full min-w-[8rem] rounded border border-[var(--brand)] bg-[var(--paper-card)] px-2 py-1 text-sm text-[var(--ink)] focus:outline-none';

  if (SELECT_OPTIONS[field]) {
    return (
      <select
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={base}
      >
        <option value="">—</option>
        {SELECT_OPTIONS[field].map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  const listKey = DATALIST_FIELDS[field];
  const listId = listKey ? `wizard-dl-${listKey}` : undefined;
  return (
    <>
      <input
        autoFocus
        type="text"
        value={draft}
        list={listId}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={base}
      />
      {listKey && (
        <datalist id={listId}>
          {datalists[listKey].map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      )}
    </>
  );
}
