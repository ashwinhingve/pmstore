'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from '@/store/useToastStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, errorMessage } from '@/components/admin/inventory/shared';
import { Plus, Pencil, Building2, Loader2, Search } from 'lucide-react';

interface Supplier {
  _id: string;
  name: string;
  gstin?: string;
  drugLicenseNo?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
}

const EMPTY = {
  name: '', gstin: '', drugLicenseNo: '', contactPerson: '', phone: '',
  email: '', address: '', paymentTerms: '', notes: '',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/suppliers?limit=50&search=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (res.ok) setSuppliers(body.data ?? []);
      else toast.error(errorMessage(body, "Couldn't load suppliers."));
    } catch {
      toast.error("Couldn't load suppliers. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSuppliers(search), 250);
    return () => clearTimeout(t);
  }, [search, fetchSuppliers]);

  function openNew() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(s: Supplier) {
    setForm({
      name: s.name, gstin: s.gstin ?? '', drugLicenseNo: s.drugLicenseNo ?? '',
      contactPerson: s.contactPerson ?? '', phone: s.phone ?? '', email: s.email ?? '',
      address: s.address ?? '', paymentTerms: s.paymentTerms ?? '', notes: s.notes ?? '',
    });
    setEditingId(s._id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/inventory/suppliers/${editingId}`
        : '/api/admin/inventory/suppliers';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(errorMessage(body, "Couldn't save the supplier."));
        return;
      }
      toast.success(editingId ? 'Supplier updated.' : 'Supplier added.');
      setShowForm(false);
      setForm(EMPTY);
      setEditingId(null);
      fetchSuppliers(search);
    } catch {
      toast.error("Couldn't save the supplier. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Suppliers"
        description="Distributors and wholesalers you buy stock from — separate from the drug manufacturer."
      >
        <Button type="button" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add supplier
        </Button>
      </AdminPageHeader>

      {showForm && (
        <Card className="p-5">
          <h2 className="mb-4 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
            {editingId ? 'Edit supplier' : 'New supplier'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Supplier name" required>
              <Input value={form.name} onChange={set('name')} placeholder="e.g., Medico Agencies" maxLength={160} />
            </Field>
            <Field label="Contact person">
              <Input value={form.contactPerson} onChange={set('contactPerson')} maxLength={120} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={set('phone')} maxLength={20} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="GSTIN">
              <Input value={form.gstin} onChange={set('gstin')} maxLength={20} />
            </Field>
            <Field label="Drug licence no.">
              <Input value={form.drugLicenseNo} onChange={set('drugLicenseNo')} maxLength={60} />
            </Field>
            <Field label="Payment terms">
              <Input value={form.paymentTerms} onChange={set('paymentTerms')} placeholder="e.g., 30 days credit" maxLength={120} />
            </Field>
            <Field label="Address" full>
              <textarea
                value={form.address}
                onChange={set('address')}
                rows={2}
                maxLength={500}
                className="flex w-full rounded-[var(--radius-sm)] border-2 border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 py-3 text-base focus:outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_4px_var(--brand-soft)]"
              />
            </Field>
            <Field label="Notes" full>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={2}
                maxLength={1000}
                className="flex w-full rounded-[var(--radius-sm)] border-2 border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 py-3 text-base focus:outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_4px_var(--brand-soft)]"
              />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={saving} disabled={!form.name.trim()}>
                {editingId ? 'Save changes' : 'Add supplier'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-40)]" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers…" className="pl-9" />
      </div>

      {/* List */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading suppliers…
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Building2 className="h-8 w-8 text-[var(--ink-40)]" />
            <p className="text-[var(--ink)]">No suppliers yet</p>
            <p className="max-w-sm text-sm text-[var(--ink-70)]">Add the distributors you buy stock from so you can record purchases against them.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--foil-soft)]">
            {suppliers.map((s) => (
              <li key={s._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link href={`/admin/inventory/suppliers/${s._id}`} className="-mx-2 min-w-0 flex-1 rounded-[var(--radius-sm)] px-2 py-1 hover:bg-[var(--foil-soft)]">
                  <p className="flex items-center gap-2 font-medium text-[var(--ink)]">
                    <Building2 className="h-4 w-4 shrink-0 text-[var(--ink-40)]" />
                    <span className="truncate">{s.name}</span>
                    {!s.isActive && <span className="rounded-[var(--radius-pill)] bg-[var(--foil-soft)] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[var(--ink-40)]">Inactive</span>}
                  </p>
                  <p className="truncate text-sm text-[var(--ink-70)]">
                    {[s.contactPerson, s.phone, s.gstin].filter(Boolean).join(' · ') || '—'}
                  </p>
                </Link>
                <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(s)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        {label}{required && <span className="text-[var(--ink-40)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
