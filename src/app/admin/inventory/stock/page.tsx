'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from '@/store/useToastStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Money, Num, ExpiryCell, errorMessage } from '@/components/admin/inventory/shared';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Loader2, PackageSearch, Search, Download } from 'lucide-react';

interface Batch {
  _id: string;
  batchNumber: string;
  expiryDate?: string;
  quantityRemaining: number;
  costPrice: number;
  mrp?: number;
  supplierName?: string;
  purchaseNumber?: string;
  receivedAt?: string;
}
interface StockRow {
  _id: string;
  name: string;
  sku: string;
  manufacturer: string;
  stock: number;
  rackLocation?: string;
  reorderLevel?: number;
  expiryDate?: string;
  packSize: number;
  packUnit: string;
  mrp?: number;
  price: number;
  batches: Batch[];
}

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'low', label: 'Low stock' },
  { key: 'out', label: 'Out of stock' },
  { key: 'expiring', label: 'Expiring soon' },
  { key: 'expired', label: 'Expired' },
];

function StockInner() {
  const params = useSearchParams();
  const [filter, setFilter] = useState(params.get('filter') ?? '');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (filter) qs.set('filter', filter);
      if (search.trim()) qs.set('search', search.trim());
      const res = await fetch(`/api/admin/inventory/stock?${qs}`);
      const body = await res.json();
      if (res.ok) {
        setRows(body.data ?? []);
        setPages(body.pagination?.pages ?? 1);
      } else {
        toast.error(errorMessage(body, "Couldn't load stock."));
      }
    } catch {
      toast.error("Couldn't load stock. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => {
    const t = setTimeout(fetchStock, 250);
    return () => clearTimeout(t);
  }, [fetchStock]);

  useEffect(() => setPage(1), [filter, search]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Stock & batches" description="Sellable stock per product, with the batch and expiry behind it.">
        <Button asChild variant="secondary">
          <a href={`/api/admin/inventory/export?type=stock${filter ? `&filter=${filter}` : ''}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </Button>
      </AdminPageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-[var(--radius-pill)] px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f.key
                  ? 'bg-[var(--brand)] text-[var(--brand-ink)]'
                  : 'bg-[var(--foil-soft)] text-[var(--ink-70)] hover:text-[var(--ink)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-40)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, maker…" className="pl-9" />
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading stock…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <PackageSearch className="h-8 w-8 text-[var(--ink-40)]" />
            <p className="text-[var(--ink)]">Nothing to show</p>
            <p className="max-w-sm text-sm text-[var(--ink-70)]">No products match this filter. Receive a purchase or add opening stock to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--foil-soft)]">
            {rows.map((row) => {
              const isOpen = expanded.has(row._id);
              return (
                <li key={row._id}>
                  <button
                    type="button"
                    onClick={() => toggle(row._id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--foil-soft)]"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ink-40)]" /> : <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ink-40)]" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[var(--ink)]">{row.name}</span>
                      <span className="block truncate text-xs text-[var(--ink-40)]" style={{ fontFamily: 'var(--font-data)' }}>
                        {row.sku} · {row.manufacturer}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-xs text-[var(--ink-40)]">Expiry</span>
                      <ExpiryCell date={row.expiryDate} />
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs text-[var(--ink-40)]">In stock</span>
                      <span
                        className="tabular-nums font-semibold"
                        style={{ fontFamily: 'var(--font-data)', color: row.stock === 0 ? 'var(--ink-40)' : row.stock <= 10 ? 'var(--tint-amber)' : 'var(--ink)' }}
                      >
                        {row.stock}
                      </span>
                    </span>
                  </button>

                  {isOpen && <BatchDetail row={row} onRackSaved={fetchStock} />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-[var(--ink-70)]">Page {page} of {pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function BatchDetail({ row, onRackSaved }: { row: StockRow; onRackSaved: () => void }) {
  const [rack, setRack] = useState(row.rackLocation ?? '');
  const [reorder, setReorder] = useState(String(row.reorderLevel ?? 10));
  const [saving, setSaving] = useState(false);
  const [confirmBatch, setConfirmBatch] = useState<string | null>(null);
  const [writingOff, setWritingOff] = useState<string | null>(null);

  async function writeOff(batch: Batch) {
    setWritingOff(batch._id);
    try {
      const res = await fetch('/api/admin/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: row._id,
          direction: 'out',
          reason: 'expiry_writeoff',
          quantity: batch.quantityRemaining,
          batchId: batch._id,
          note: `Write-off of batch ${batch.batchNumber}`,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(errorMessage(body, "Couldn't write off this batch."));
        return;
      }
      toast.success(`Wrote off ${batch.quantityRemaining} from batch ${batch.batchNumber}.`);
      setConfirmBatch(null);
      onRackSaved();
    } catch {
      toast.error("Couldn't write off this batch. Try again.");
    } finally {
      setWritingOff(null);
    }
  }

  async function saveFields() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${row._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rackLocation: rack, reorderLevel: Number(reorder) || 0 }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(errorMessage(body, "Couldn't save these details."));
        return;
      }
      toast.success('Saved.');
      onRackSaved();
    } catch {
      toast.error("Couldn't save these details. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-[var(--foil-soft)] bg-[var(--foil-soft)]/40 px-4 py-4 sm:pl-11">
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--ink-70)]">Rack / shelf location</span>
          <Input value={rack} onChange={(e) => setRack(e.target.value)} placeholder="e.g., A-12" maxLength={60} className="h-10 w-40" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--ink-70)]">Reorder level</span>
          <Input type="number" min={0} value={reorder} onChange={(e) => setReorder(e.target.value)} className="h-10 w-28" />
        </label>
        <Button size="sm" variant="secondary" loading={saving} onClick={saveFields}>Save</Button>
      </div>

      {row.batches.length === 0 ? (
        <p className="text-sm text-[var(--ink-70)]">
          No batches recorded for this product. Its {row.stock} in stock predates batch tracking — add opening stock via an adjustment to record its batch and expiry.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--ink-40)]">
                <th className="pb-2 pr-4 font-semibold">Batch</th>
                <th className="pb-2 pr-4 font-semibold">Expiry</th>
                <th className="pb-2 pr-4 text-right font-semibold">Qty left</th>
                <th className="pb-2 pr-4 text-right font-semibold">Cost</th>
                <th className="pb-2 pr-4 text-right font-semibold">MRP</th>
                <th className="pb-2 pr-4 font-semibold">Supplier</th>
                <th className="pb-2 text-right font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--foil-soft)]">
              {row.batches.map((b) => (
                <tr key={b._id} className="text-[var(--ink)]">
                  <td className="py-2 pr-4" style={{ fontFamily: 'var(--font-data)' }}>{b.batchNumber}</td>
                  <td className="py-2 pr-4"><ExpiryCell date={b.expiryDate} /></td>
                  <td className="py-2 pr-4 text-right"><Num value={b.quantityRemaining} /></td>
                  <td className="py-2 pr-4 text-right"><Money value={b.costPrice} /></td>
                  <td className="py-2 pr-4 text-right">{b.mrp != null ? <Money value={b.mrp} /> : '—'}</td>
                  <td className="py-2 pr-4 text-[var(--ink-70)]">{b.supplierName || '—'}{b.purchaseNumber ? ` · ${b.purchaseNumber}` : ''}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {confirmBatch === b._id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs text-[var(--ink-70)]">Write off {b.quantityRemaining}?</span>
                        <Button size="sm" variant="secondary" onClick={() => setConfirmBatch(null)} disabled={writingOff === b._id}>No</Button>
                        <Button size="sm" variant="destructive" loading={writingOff === b._id} onClick={() => writeOff(b)}>Yes</Button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmBatch(b._id)}
                        className="text-xs font-medium text-[var(--ink-70)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
                      >
                        Write off
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={<div className="p-10 text-[var(--ink-70)]">Loading…</div>}>
      <StockInner />
    </Suspense>
  );
}
