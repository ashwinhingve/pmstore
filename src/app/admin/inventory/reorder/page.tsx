'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/store/useToastStore';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Num, errorMessage } from '@/components/admin/inventory/shared';
import { Loader2, ClipboardCheck, ShoppingCart } from 'lucide-react';

interface ReorderRow {
  _id: string;
  name: string;
  sku: string;
  manufacturer: string;
  stock: number;
  reorderLevel: number;
  packUnit: string;
  suggestedQty: number;
  lastSupplierName: string | null;
}

export default function ReorderPage() {
  const [rows, setRows] = useState<ReorderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/reorder?page=${page}&limit=30`);
      const body = await res.json();
      if (res.ok) {
        setRows(body.data ?? []);
        setPages(body.pagination?.pages ?? 1);
      } else {
        toast.error(errorMessage(body, "Couldn't load the reorder list."));
      }
    } catch {
      toast.error("Couldn't load the reorder list. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reorder list"
        description="Products at or below their reorder level — what to buy next, and who from."
      >
        <Button asChild>
          <Link href="/admin/inventory/purchases/new"><ShoppingCart className="h-4 w-4" /> New purchase</Link>
        </Button>
      </AdminPageHeader>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <ClipboardCheck className="h-8 w-8 text-[var(--ink-40)]" />
            <p className="text-[var(--ink)]">Nothing to reorder</p>
            <p className="max-w-sm text-sm text-[var(--ink-70)]">Every product is above its reorder level. Set per-product reorder levels in Stock &amp; batches.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[var(--foil-soft)] text-left text-xs uppercase tracking-wide text-[var(--ink-40)]">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 text-right font-semibold">In stock</th>
                  <th className="px-4 py-3 text-right font-semibold">Reorder level</th>
                  <th className="px-4 py-3 text-right font-semibold">Suggested qty</th>
                  <th className="px-4 py-3 font-semibold">Last supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--foil-soft)]">
                {rows.map((r) => (
                  <tr key={r._id} className="text-[var(--ink)]">
                    <td className="px-4 py-2.5">
                      <span className="block font-medium">{r.name}</span>
                      <span className="block text-xs text-[var(--ink-40)]" style={{ fontFamily: 'var(--font-data)' }}>{r.sku} · {r.manufacturer}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-semibold tabular-nums" style={{ fontFamily: 'var(--font-data)', color: r.stock === 0 ? 'var(--ink-40)' : 'var(--tint-amber)' }}>
                        {r.stock}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right"><Num value={r.reorderLevel} /></td>
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ fontFamily: 'var(--font-data)', color: 'var(--brand-deep)' }}>{r.suggestedQty}</td>
                    <td className="px-4 py-2.5 text-[var(--ink-70)]">{r.lastSupplierName ?? '—'}</td>
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
