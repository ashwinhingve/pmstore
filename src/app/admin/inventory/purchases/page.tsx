'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/store/useToastStore';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Money, StatusPill, PaymentPill, errorMessage } from '@/components/admin/inventory/shared';
import { formatDate } from '@/lib/utils/format-date';
import { Plus, Loader2, ShoppingCart, Search, ChevronRight, Download } from 'lucide-react';

interface PurchaseRow {
  _id: string;
  purchaseNumber: string;
  supplierName: string;
  invoiceNumber?: string;
  status: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PurchasesPage() {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) qs.set('status', status);
      if (search.trim()) qs.set('search', search.trim());
      const res = await fetch(`/api/admin/inventory/purchases?${qs}`);
      const body = await res.json();
      if (res.ok) {
        setRows(body.data ?? []);
        setPages(body.pagination?.pages ?? 1);
      } else {
        toast.error(errorMessage(body, "Couldn't load purchases."));
      }
    } catch {
      toast.error("Couldn't load purchases. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    const t = setTimeout(fetchPurchases, 250);
    return () => clearTimeout(t);
  }, [fetchPurchases]);
  useEffect(() => setPage(1), [status, search]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Purchases" description="Stock received from suppliers, with the invoice behind it.">
        <Button asChild variant="secondary">
          <a href={`/api/admin/inventory/export?type=purchases${status ? `&status=${status}` : ''}`}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </Button>
        <Button asChild>
          <Link href="/admin/inventory/purchases/new"><Plus className="h-4 w-4" /> New purchase</Link>
        </Button>
      </AdminPageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-48">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={STATUSES} />
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-40)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search number, invoice, supplier…" className="pl-9" />
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading purchases…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <ShoppingCart className="h-8 w-8 text-[var(--ink-40)]" />
            <p className="text-[var(--ink)]">No purchases yet</p>
            <p className="max-w-sm text-sm text-[var(--ink-70)]">Record a purchase to bring stock in from a supplier with batch and expiry details.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--foil-soft)]">
            {rows.map((p) => (
              <li key={p._id}>
                <Link href={`/admin/inventory/purchases/${p._id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--foil-soft)]">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-[var(--ink)]">
                      <span style={{ fontFamily: 'var(--font-data)' }}>{p.purchaseNumber}</span>
                      <StatusPill status={p.status} />
                      <PaymentPill status={p.paymentStatus} />
                    </p>
                    <p className="truncate text-sm text-[var(--ink-70)]">
                      {p.supplierName} · {p.itemCount} item{p.itemCount === 1 ? '' : 's'}
                      {p.invoiceNumber ? ` · inv ${p.invoiceNumber}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Money value={p.total} className="font-semibold text-[var(--ink)]" />
                    <p className="text-xs text-[var(--ink-40)]">{formatDate(p.createdAt)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ink-40)]" />
                </Link>
              </li>
            ))}
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
