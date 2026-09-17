'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/store/useToastStore';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Num, errorMessage, MOVEMENT_TYPE_LABELS } from '@/components/admin/inventory/shared';
import { ProductPicker, type PickedProduct } from '@/components/admin/inventory/ProductPicker';
import { formatDateTime } from '@/lib/utils/format-date';
import { Loader2, ScrollText, Download } from 'lucide-react';

interface HistoryRow {
  _id: string;
  productName?: string;
  batchNumber?: string;
  type: string;
  quantityDelta: number;
  balanceAfter?: number;
  reason?: string;
  refLabel?: string;
  note?: string;
  createdAt: string;
}

const TYPES = ['', 'purchase', 'sale', 'adjustment', 'purchase_return', 'opening'];

export default function StockHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [type, setType] = useState('');
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '30' });
      if (type) qs.set('type', type);
      if (product) qs.set('productId', product._id);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const res = await fetch(`/api/admin/inventory/history?${qs}`);
      const body = await res.json();
      if (res.ok) {
        setRows(body.data ?? []);
        setPages(body.pagination?.pages ?? 1);
      } else {
        toast.error(errorMessage(body, "Couldn't load the stock history."));
      }
    } catch {
      toast.error("Couldn't load the stock history. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [page, type, product, from, to]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useEffect(() => setPage(1), [type, product, from, to]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Stock history" description="Every stock movement, newest first — the full audit trail.">
        <Button asChild variant="secondary">
          <a href={`/api/admin/inventory/export?type=history${type ? `&movementType=${type}` : ''}${product ? `&productId=${product._id}` : ''}`}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </Button>
      </AdminPageHeader>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Movement type</span>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={TYPES.map((t) => ({ value: t, label: t ? MOVEMENT_TYPE_LABELS[t] : 'All types' }))}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Product</span>
            <ProductPicker selected={product} onSelect={setProduct} placeholder="All products" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading history…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <ScrollText className="h-8 w-8 text-[var(--ink-40)]" />
            <p className="text-[var(--ink)]">No movements found</p>
            <p className="max-w-sm text-sm text-[var(--ink-70)]">Stock movements appear here as you receive purchases, sell, adjust or return stock.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--foil-soft)] text-left text-xs uppercase tracking-wide text-[var(--ink-40)]">
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 text-right font-semibold">Change</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--foil-soft)]">
                {rows.map((r) => (
                  <tr key={r._id} className="text-[var(--ink)]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--ink-70)]" style={{ fontFamily: 'var(--font-data)' }}>{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-2.5">{r.productName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[var(--ink-70)]">{MOVEMENT_TYPE_LABELS[r.type] ?? r.type}</td>
                    <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-data)' }}>{r.batchNumber ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ fontFamily: 'var(--font-data)', color: r.quantityDelta >= 0 ? 'var(--brand-deep)' : 'var(--ink-70)' }}>
                      {r.quantityDelta >= 0 ? '+' : '−'}<Num value={Math.abs(r.quantityDelta)} />
                    </td>
                    <td className="px-4 py-2.5 text-right" style={{ fontFamily: 'var(--font-data)' }}>{r.balanceAfter ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[var(--ink-70)]">
                      {r.refLabel ?? '—'}{r.reason ? ` · ${r.reason}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
