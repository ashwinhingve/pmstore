'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/store/useToastStore';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Money, Num, ExpiryCell, StatusPill, PaymentPill, errorMessage } from '@/components/admin/inventory/shared';
import { formatDate } from '@/lib/utils/format-date';
import { ArrowLeft, Loader2, PackageCheck, Ban, Trash2 } from 'lucide-react';

interface PurchaseItem {
  productName: string; batchNumber: string; expiryDate?: string;
  quantity: number; freeQuantity?: number; costPrice: number; mrp?: number; gstRate?: number; lineTotal: number;
}
interface Purchase {
  _id: string; purchaseNumber: string; supplierName: string;
  invoiceNumber?: string; invoiceDate?: string; status: string; paymentStatus: string;
  items: PurchaseItem[]; subtotal: number; taxAmount: number; total: number;
  amountPaid: number; notes?: string; receivedAt?: string; createdAt: string;
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null);

  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [amountPaid, setAmountPaid] = useState('');

  const fetchPurchase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/purchases/${id}`);
      const body = await res.json();
      if (res.ok) {
        setPurchase(body.data);
        setPaymentStatus(body.data.paymentStatus);
        setAmountPaid(String(body.data.amountPaid ?? ''));
      } else {
        toast.error(errorMessage(body, "Couldn't load the purchase."));
      }
    } catch {
      toast.error("Couldn't load the purchase. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPurchase(); }, [fetchPurchase]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/inventory/purchases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(errorMessage(body, "Couldn't update the purchase.")); return; }
      if (action === 'receive') toast.success('Purchase received — stock updated.');
      else if (action === 'cancel') toast.success('Purchase cancelled.');
      else if (action === 'pay') toast.success('Payment updated.');
      setConfirm(null);
      fetchPurchase();
    } catch {
      toast.error("Couldn't update the purchase. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function del() {
    setBusy('delete');
    try {
      const res = await fetch(`/api/admin/inventory/purchases/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) { toast.error(errorMessage(body, "Couldn't delete the purchase.")); return; }
      toast.success('Purchase deleted.');
      router.push('/admin/inventory/purchases');
    } catch {
      toast.error("Couldn't delete the purchase. Try again.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>;
  }
  if (!purchase) {
    return (
      <div className="space-y-4">
        <Link href="/admin/inventory/purchases" className="inline-flex items-center gap-1 text-sm text-[var(--ink-70)] hover:text-[var(--ink)]"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <p className="text-[var(--ink)]">This purchase could not be found.</p>
      </div>
    );
  }

  const editable = purchase.status === 'draft' || purchase.status === 'ordered';
  const outstanding = Math.max(0, purchase.total - (purchase.amountPaid ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory/purchases" className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--ink-70)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-4 w-4" /> Back to purchases
        </Link>
        <AdminPageHeader
          title={purchase.purchaseNumber}
          description={
            <span className="flex flex-wrap items-center gap-2">
              {purchase.supplierName}
              <StatusPill status={purchase.status} />
              <PaymentPill status={purchase.paymentStatus} />
            </span>
          }
        >
          {editable && (
            <>
              <Button type="button" loading={busy === 'receive'} onClick={() => act('receive')}>
                <PackageCheck className="h-4 w-4" /> Mark received
              </Button>
              {confirm === 'cancel' ? (
                <span className="flex items-center gap-2">
                  <span className="text-sm text-[var(--ink-70)]">Cancel it?</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm(null)}>No</Button>
                  <Button type="button" variant="destructive" size="sm" loading={busy === 'cancel'} onClick={() => act('cancel')}>Yes, cancel</Button>
                </span>
              ) : (
                <Button type="button" variant="secondary" onClick={() => setConfirm('cancel')}><Ban className="h-4 w-4" /> Cancel</Button>
              )}
            </>
          )}
        </AdminPageHeader>
      </div>

      {/* Meta */}
      <Card className="p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Invoice no." value={purchase.invoiceNumber || '—'} mono />
          <Meta label="Invoice date" value={purchase.invoiceDate ? formatDate(purchase.invoiceDate) : '—'} />
          <Meta label="Created" value={formatDate(purchase.createdAt)} />
          <Meta label="Received" value={purchase.receivedAt ? formatDate(purchase.receivedAt) : 'Not received'} />
        </dl>
        {purchase.notes && <p className="mt-4 text-sm text-[var(--ink-70)]">{purchase.notes}</p>}
      </Card>

      {/* Items */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[var(--foil-soft)] text-left text-xs uppercase tracking-wide text-[var(--ink-40)]">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Batch</th>
                <th className="px-4 py-3 font-semibold">Expiry</th>
                <th className="px-4 py-3 text-right font-semibold">Qty (+free)</th>
                <th className="px-4 py-3 text-right font-semibold">Cost</th>
                <th className="px-4 py-3 text-right font-semibold">GST</th>
                <th className="px-4 py-3 text-right font-semibold">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--foil-soft)]">
              {purchase.items.map((it, i) => (
                <tr key={i} className="text-[var(--ink)]">
                  <td className="px-4 py-2.5">{it.productName}</td>
                  <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-data)' }}>{it.batchNumber}</td>
                  <td className="px-4 py-2.5"><ExpiryCell date={it.expiryDate} /></td>
                  <td className="px-4 py-2.5 text-right"><Num value={it.quantity} />{it.freeQuantity ? ` (+${it.freeQuantity})` : ''}</td>
                  <td className="px-4 py-2.5 text-right"><Money value={it.costPrice} /></td>
                  <td className="px-4 py-2.5 text-right" style={{ fontFamily: 'var(--font-data)' }}>{it.gstRate ?? 0}%</td>
                  <td className="px-4 py-2.5 text-right"><Money value={it.lineTotal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-[var(--foil-soft)] px-4 py-4">
          <div className="space-y-1 text-right text-sm">
            <p className="text-[var(--ink-70)]">Subtotal: <Money value={purchase.subtotal} /></p>
            <p className="text-[var(--ink-70)]">GST: <Money value={purchase.taxAmount} /></p>
            <p className="text-[length:var(--step-1)] font-bold text-[var(--ink)]">Total: <Money value={purchase.total} /></p>
          </div>
        </div>
      </Card>

      {/* Payment (not for cancelled) */}
      {purchase.status !== 'cancelled' && (
        <Card className="p-5">
          <h2 className="mb-3 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">Payment</h2>
          <div className="grid items-end gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Status</span>
              <Select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                options={[{ value: 'unpaid', label: 'Unpaid' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }]}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Amount paid</span>
              <Input type="number" min={0} step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </label>
            <Button
              type="button"
              loading={busy === 'pay'}
              onClick={() => act('pay', { paymentStatus, amountPaid: Number(amountPaid) || 0 })}
            >
              Update payment
            </Button>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-70)]">Outstanding: <Money value={outstanding} className="font-semibold text-[var(--ink)]" /></p>
        </Card>
      )}

      {/* Danger zone — delete a non-received purchase */}
      {purchase.status !== 'received' && (
        <div className="flex justify-end">
          {confirm === 'delete' ? (
            <span className="flex items-center gap-2">
              <span className="text-sm text-[var(--ink-70)]">Delete this purchase permanently?</span>
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm(null)}>Keep</Button>
              <Button type="button" variant="destructive" size="sm" loading={busy === 'delete'} onClick={del}>Delete</Button>
            </span>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm('delete')}>
              <Trash2 className="h-4 w-4" /> Delete purchase
            </Button>
          )}
        </div>
      )}
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
