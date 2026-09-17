'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/store/useToastStore';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Money, StatusPill, PaymentPill, errorMessage } from '@/components/admin/inventory/shared';
import { formatDate } from '@/lib/utils/format-date';
import { ArrowLeft, Loader2, Pencil, ShoppingCart, ChevronRight } from 'lucide-react';

interface Supplier {
  _id: string; name: string; gstin?: string; drugLicenseNo?: string;
  contactPerson?: string; phone?: string; email?: string; address?: string;
  paymentTerms?: string; notes?: string; isActive: boolean;
}
interface PurchaseRow {
  _id: string; purchaseNumber: string; status: string; paymentStatus: string;
  total: number; itemCount: number; createdAt: string;
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [stats, setStats] = useState<{ purchaseCount: number; outstanding: number } | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`/api/admin/inventory/suppliers/${id}`),
        fetch(`/api/admin/inventory/purchases?supplierId=${id}&limit=50`),
      ]);
      const sBody = await sRes.json();
      const pBody = await pRes.json();
      if (sRes.ok) { setSupplier(sBody.data); setStats(sBody.stats); }
      else toast.error(errorMessage(sBody, "Couldn't load the supplier."));
      if (pRes.ok) setPurchases(pBody.data ?? []);
    } catch {
      toast.error("Couldn't load the supplier. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>;
  }
  if (!supplier) {
    return (
      <div className="space-y-4">
        <Link href="/admin/inventory/suppliers" className="inline-flex items-center gap-1 text-sm text-[var(--ink-70)] hover:text-[var(--ink)]"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <p className="text-[var(--ink)]">This supplier could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory/suppliers" className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--ink-70)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-4 w-4" /> Back to suppliers
        </Link>
        <AdminPageHeader
          title={supplier.name}
          description={supplier.isActive ? 'Active supplier' : 'Inactive supplier'}
        >
          <Button asChild variant="secondary">
            <Link href={`/admin/inventory/purchases/new`}><ShoppingCart className="h-4 w-4" /> New purchase</Link>
          </Button>
        </AdminPageHeader>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-[var(--ink-70)]">Purchases</p>
          <p className="mt-1 text-[length:var(--step-2)] font-bold tabular-nums text-[var(--ink)]" style={{ fontFamily: 'var(--font-data)' }}>{stats?.purchaseCount ?? 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--ink-70)]">Outstanding dues</p>
          <p className="mt-1 text-[length:var(--step-2)] font-bold text-[var(--ink)]"><Money value={stats?.outstanding} /></p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--ink-70)]">Payment terms</p>
          <p className="mt-1 text-[var(--ink)]">{supplier.paymentTerms || '—'}</p>
        </Card>
      </div>

      {/* Details */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[length:var(--step-0)] font-semibold text-[var(--ink)]">Contact & compliance</h2>
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/inventory/suppliers"><Pencil className="h-4 w-4" /> Edit in suppliers</Link>
          </Button>
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Meta label="Contact person" value={supplier.contactPerson || '—'} />
          <Meta label="Phone" value={supplier.phone || '—'} mono />
          <Meta label="Email" value={supplier.email || '—'} />
          <Meta label="GSTIN" value={supplier.gstin || '—'} mono />
          <Meta label="Drug licence" value={supplier.drugLicenseNo || '—'} mono />
          <Meta label="Address" value={supplier.address || '—'} />
        </dl>
        {supplier.notes && <p className="mt-4 text-sm text-[var(--ink-70)]">{supplier.notes}</p>}
      </Card>

      {/* Purchases */}
      <Card>
        <div className="border-b border-[var(--foil-soft)] px-5 py-3">
          <h2 className="text-[length:var(--step-0)] font-semibold text-[var(--ink)]">Recent purchases</h2>
        </div>
        {purchases.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--ink-70)]">No purchases from this supplier yet.</div>
        ) : (
          <ul className="divide-y divide-[var(--foil-soft)]">
            {purchases.map((p) => (
              <li key={p._id}>
                <Link href={`/admin/inventory/purchases/${p._id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--foil-soft)]">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-[var(--ink)]">
                      <span style={{ fontFamily: 'var(--font-data)' }}>{p.purchaseNumber}</span>
                      <StatusPill status={p.status} />
                      <PaymentPill status={p.paymentStatus} />
                    </p>
                    <p className="text-sm text-[var(--ink-70)]">{p.itemCount} item{p.itemCount === 1 ? '' : 's'}</p>
                  </div>
                  <Money value={p.total} className="shrink-0 font-semibold text-[var(--ink)]" />
                  <span className="shrink-0 text-xs text-[var(--ink-40)]">{formatDate(p.createdAt)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ink-40)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--ink-40)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--ink)]" style={mono ? { fontFamily: 'var(--font-data)' } : undefined}>{value}</dd>
    </div>
  );
}
