'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/store/useToastStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Plus, Trash2, Loader2, Factory } from 'lucide-react';

/**
 * Admin → Manufacturers. A standalone place to add manufacturers to the
 * product-form autocomplete without having to attach them to a product. Backed by
 * the manufacturer catalogue API (GET list · idempotent POST add · DELETE remove).
 */
export default function AdminManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchManufacturers();
  }, []);

  async function fetchManufacturers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products/manufacturers');
      const data = await res.json();
      if (res.ok) setManufacturers(data.manufacturers ?? []);
      else toast.error(data.error?.message || data.error || "Couldn't load the manufacturers.");
    } catch {
      toast.error("Couldn't load the manufacturers. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/products/manufacturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message || data.error || "Couldn't add the manufacturer.");
        return;
      }
      if (data.existed) toast.info(`“${data.manufacturer}” is already in the list.`);
      else toast.success(`Added “${data.manufacturer}”.`);
      setName('');
      fetchManufacturers();
    } catch {
      toast.error("Couldn't add the manufacturer. Try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(manufacturerName: string) {
    setDeleting(manufacturerName);
    try {
      const res = await fetch('/api/admin/products/manufacturers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: manufacturerName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message || data.error || "Couldn't remove the manufacturer.");
        return;
      }
      toast.success(`Removed “${manufacturerName}”.`);
      setManufacturers((prev) => prev.filter((m) => m !== manufacturerName));
    } catch {
      toast.error("Couldn't remove the manufacturer. Try again.");
    } finally {
      setDeleting(null);
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Manufacturers"
        description={
          loading
            ? 'Loading…'
            : `${manufacturers.length} manufacturer${manufacturers.length === 1 ? '' : 's'} in the product autocomplete`
        }
      />

      {/* Add form */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5 shadow-[var(--shadow-xs)]">
        <h2 className="mb-1 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">Add a manufacturer</h2>
        <p className="mb-4 text-sm text-[var(--ink-70)]">
          Adds a manufacturer to the product form&apos;s dropdown so it&apos;s selectable next time. You
          don&apos;t need to attach it to a product.
        </p>
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <label htmlFor="manufacturer-name" className="sr-only">
              Manufacturer name
            </label>
            <Input
              id="manufacturer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cipla"
              maxLength={120}
            />
          </div>
          <Button type="submit" loading={adding} disabled={!name.trim()} className="sm:w-auto">
            <Plus className="h-4 w-4" />
            Add manufacturer
          </Button>
        </form>
      </div>

      {/* List */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-xs)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading manufacturers…
          </div>
        ) : manufacturers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Factory className="h-8 w-8 text-[var(--ink-40)]" aria-hidden="true" />
            <p className="text-[var(--ink)]">No manufacturers added yet</p>
            <p className="max-w-sm text-sm text-[var(--ink-70)]">
              Add a manufacturer above and it&apos;ll show up in the product form&apos;s dropdown.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--foil-soft)]">
            {manufacturers.map((manufacturer) => (
              <li key={manufacturer} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="flex min-w-0 items-center gap-2.5 text-[var(--ink)]">
                  <Factory className="h-4 w-4 shrink-0 text-[var(--ink-40)]" aria-hidden="true" />
                  <span className="truncate">{manufacturer}</span>
                </span>
                {pendingDelete === manufacturer ? (
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-[var(--ink-70)]">Remove?</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPendingDelete(null)}
                      disabled={deleting === manufacturer}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      loading={deleting === manufacturer}
                      onClick={() => handleDelete(manufacturer)}
                    >
                      Remove
                    </Button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(manufacturer)}
                    aria-label={`Remove ${manufacturer}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-40)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
