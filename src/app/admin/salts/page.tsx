'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/store/useToastStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Plus, Trash2, Loader2, FlaskConical } from 'lucide-react';

/**
 * Admin → Salts. A standalone place to add salts to the product-form autocomplete
 * without having to attach them to a product. Backed by the existing salt catalogue
 * API (GET list · idempotent POST add · DELETE remove). Base-list salts are compiled
 * in code and aren't listed here — this manages the admin-added ones only.
 */
export default function AdminSaltsPage() {
  const [salts, setSalts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchSalts();
  }, []);

  async function fetchSalts() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products/salts');
      const data = await res.json();
      if (res.ok) setSalts(data.salts ?? []);
      else toast.error(data.error?.message || data.error || "Couldn't load the salts.");
    } catch {
      toast.error("Couldn't load the salts. Check your connection and try again.");
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
      const res = await fetch('/api/admin/products/salts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message || data.error || "Couldn't add the salt.");
        return;
      }
      if (data.existed) toast.info(`“${data.salt}” is already suggestible.`);
      else toast.success(`Added “${data.salt}”.`);
      setName('');
      fetchSalts();
    } catch {
      toast.error("Couldn't add the salt. Try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(saltName: string) {
    setDeleting(saltName);
    try {
      const res = await fetch('/api/admin/products/salts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saltName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message || data.error || "Couldn't remove the salt.");
        return;
      }
      toast.success(`Removed “${saltName}”.`);
      setSalts((prev) => prev.filter((s) => s !== saltName));
    } catch {
      toast.error("Couldn't remove the salt. Try again.");
    } finally {
      setDeleting(null);
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Salts"
        description={
          loading
            ? 'Loading…'
            : `${salts.length} salt${salts.length === 1 ? '' : 's'} added to the product autocomplete`
        }
      />

      {/* Add form */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5 shadow-[var(--shadow-xs)]">
        <h2 className="mb-1 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">Add a salt</h2>
        <p className="mb-4 text-sm text-[var(--ink-70)]">
          Adds a salt to the product form&apos;s autocomplete so it&apos;s suggestible next time. You
          don&apos;t need to attach it to a product.
        </p>
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <label htmlFor="salt-name" className="sr-only">
              Salt name
            </label>
            <Input
              id="salt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Paracetamol"
              maxLength={120}
            />
          </div>
          <Button type="submit" loading={adding} disabled={!name.trim()} className="sm:w-auto">
            <Plus className="h-4 w-4" />
            Add salt
          </Button>
        </form>
      </div>

      {/* List */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-xs)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading salts…
          </div>
        ) : salts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <FlaskConical className="h-8 w-8 text-[var(--ink-40)]" aria-hidden="true" />
            <p className="text-[var(--ink)]">No salts added yet</p>
            <p className="max-w-sm text-sm text-[var(--ink-70)]">
              Add a salt above and it&apos;ll show up in the product form&apos;s salt dropdown.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--foil-soft)]">
            {salts.map((salt) => (
              <li key={salt} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="flex min-w-0 items-center gap-2.5 text-[var(--ink)]">
                  <FlaskConical className="h-4 w-4 shrink-0 text-[var(--ink-40)]" aria-hidden="true" />
                  <span className="truncate">{salt}</span>
                </span>
                {pendingDelete === salt ? (
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-[var(--ink-70)]">Remove?</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPendingDelete(null)}
                      disabled={deleting === salt}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      loading={deleting === salt}
                      onClick={() => handleDelete(salt)}
                    >
                      Remove
                    </Button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(salt)}
                    aria-label={`Remove ${salt}`}
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
