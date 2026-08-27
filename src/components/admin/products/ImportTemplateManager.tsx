'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ManufacturerCombobox } from './ManufacturerCombobox';
import { SaltCombobox } from './SaltCombobox';
import { OPTIONAL_FIELD_GROUPS, MANDATORY_FIELD_GROUPS } from '@/lib/import/template-fields';
import { toast } from '@/store/useToastStore';

interface TemplateView {
  id: string;
  name: string;
  includedOptionalFields: string[];
  defaultManufacturer?: string;
  defaultSalt?: string;
  updatedAt: string;
}

const emptyForm = { name: '', includedOptionalFields: [] as string[], defaultManufacturer: '', defaultSalt: '' };

/**
 * ImportTemplateManager — create, edit, and delete named bulk-import
 * templates: a chosen subset of optional columns on top of the fixed
 * mandatory set (SKU / name / manufacturer / category / salt / form / price /
 * pack / image). Each template can be downloaded as a ready-to-fill CSV, and
 * is selectable in `ProductImportClient` when importing or exporting.
 *
 * The manufacturer/salt fields here are real dropdowns backed by the same
 * catalogues the product form uses — but they only set the *example* row
 * baked into the downloaded CSV, since a plain CSV/Excel file can't carry a
 * live dropdown per cell once it leaves the browser.
 */
export function ImportTemplateManager() {
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [catalogManufacturers, setCatalogManufacturers] = useState<string[]>([]);
  const [catalogSalts, setCatalogSalts] = useState<string[]>([]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products/import-templates');
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.data)) setTemplates(data.data as TemplateView[]);
    } catch {
      toast.error('Could not load saved templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    fetch('/api/admin/products/manufacturers')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.manufacturers)) setCatalogManufacturers(data.manufacturers as string[]);
      })
      .catch(() => {});
    fetch('/api/admin/products/salts')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.salts)) setCatalogSalts(data.salts as string[]);
      })
      .catch(() => {});
  }, [loadTemplates]);

  const startCreate = () => {
    setEditingId('new');
    setForm(emptyForm);
  };

  const startEdit = (t: TemplateView) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      includedOptionalFields: t.includedOptionalFields,
      defaultManufacturer: t.defaultManufacturer || '',
      defaultSalt: t.defaultSalt || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleField = (key: string) => {
    setForm((f) => ({
      ...f,
      includedOptionalFields: f.includedOptionalFields.includes(key)
        ? f.includedOptionalFields.filter((k) => k !== key)
        : [...f.includedOptionalFields, key],
    }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Give the template a name');
      return;
    }
    setSaving(true);
    try {
      const isNew = editingId === 'new';
      const url = isNew
        ? '/api/admin/products/import-templates'
        : `/api/admin/products/import-templates/${editingId}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          includedOptionalFields: form.includedOptionalFields,
          defaultManufacturer: form.defaultManufacturer.trim() || undefined,
          defaultSalt: form.defaultSalt.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error?.message || data?.error || 'Could not save the template');
        return;
      }
      toast.success(isNew ? 'Template created' : 'Template updated');
      cancelEdit();
      loadTemplates();
    } catch {
      toast.error('Could not save the template');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: TemplateView) => {
    if (!confirm(`Delete the "${t.name}" template? This doesn't affect any products already imported with it.`)) return;
    try {
      const res = await fetch(`/api/admin/products/import-templates/${t.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Could not delete the template');
        return;
      }
      toast.success('Template deleted');
      loadTemplates();
    } catch {
      toast.error('Could not delete the template');
    }
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[var(--ink)]">Import templates</h2>
          <p className="text-sm text-[var(--ink-70)]">
            Save a named set of columns so the download and import only ask for what you need.
          </p>
        </div>
        {editingId === null && (
          <Button type="button" size="sm" variant="secondary" onClick={startCreate}>
            New template
          </Button>
        )}
      </div>

      {editingId !== null && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              {editingId === 'new' ? 'New template' : 'Edit template'}
            </h3>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label="Cancel"
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-70)] hover:bg-[var(--foil-soft)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-3 block text-sm font-medium text-[var(--ink)]" htmlFor="template-name">
            Template name
          </label>
          <Input
            id="template-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Essentials only"
            className="mb-4"
          />

          <p className="mb-2 text-sm font-medium text-[var(--ink)]">
            Always included ({MANDATORY_FIELD_GROUPS.length})
          </p>
          <ul className="mb-4 flex flex-wrap gap-2">
            {MANDATORY_FIELD_GROUPS.map((g) => (
              <li
                key={g.key}
                className="rounded-[var(--radius-pill)] bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-deep)]"
              >
                {g.label} *
              </li>
            ))}
          </ul>

          <p className="mb-2 text-sm font-medium text-[var(--ink)]">Also include</p>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OPTIONAL_FIELD_GROUPS.map((g) => (
              <Checkbox
                key={g.key}
                label={g.label}
                checked={form.includedOptionalFields.includes(g.key)}
                onChange={() => toggleField(g.key)}
              />
            ))}
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                Example manufacturer (optional)
              </label>
              <ManufacturerCombobox
                value={form.defaultManufacturer}
                onChange={(v) => setForm((f) => ({ ...f, defaultManufacturer: v }))}
                ariaLabel="Example manufacturer for the downloaded template"
                catalogManufacturers={catalogManufacturers}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                Example salt / formula (optional)
              </label>
              <SaltCombobox
                value={form.defaultSalt}
                onChange={(v) => setForm((f) => ({ ...f, defaultSalt: v }))}
                ariaLabel="Example salt for the downloaded template"
                catalogSalts={catalogSalts}
              />
            </div>
          </div>
          <p className="mb-4 text-xs text-[var(--ink-70)]">
            These fill the example row in the downloaded file — the actual cells in your
            spreadsheet stay plain text, not live dropdowns.
          </p>

          <div className="flex gap-3">
            <Button type="button" size="sm" onClick={save} loading={saving}>
              {editingId === 'new' ? 'Create template' : 'Save changes'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--ink-70)]">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-[var(--ink-70)]">
          No saved templates yet — imports and exports use every column until you create one.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--foil-soft)]">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="font-medium text-[var(--ink)]">{t.name}</p>
                <p className="text-xs text-[var(--ink-70)]">
                  {MANDATORY_FIELD_GROUPS.length + t.includedOptionalFields.length} fields
                </p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`/api/admin/products/import-templates/${t.id}/download`}
                  aria-label={`Download the ${t.name} template`}
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-70)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  aria-label={`Edit the ${t.name} template`}
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-70)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  aria-label={`Delete the ${t.name} template`}
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-70)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
