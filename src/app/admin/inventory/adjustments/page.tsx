'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/store/useToastStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Num, errorMessage, ADJUSTMENT_REASON_LABELS } from '@/components/admin/inventory/shared';
import { ProductPicker, type PickedProduct } from '@/components/admin/inventory/ProductPicker';
import { formatDate } from '@/lib/utils/format-date';
import { Plus, Loader2, SlidersHorizontal, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface Adjustment {
  _id: string;
  productName: string;
  direction: 'in' | 'out';
  quantity: number;
  reason: string;
  batchNumber?: string;
  note?: string;
  createdAt: string;
}

const IN_REASONS = ['opening', 'customer_return', 'found', 'recount', 'other'];
const OUT_REASONS = ['counter_sale', 'damage', 'wastage', 'expiry_writeoff', 'recount', 'other'];

export default function AdjustmentsPage() {
  const [list, setList] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('counter_sale');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [note, setNote] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inventory/adjustments?limit=30');
      const body = await res.json();
      if (res.ok) setList(body.data ?? []);
      else toast.error(errorMessage(body, "Couldn't load adjustments."));
    } catch {
      toast.error("Couldn't load adjustments. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  function reset() {
    setProduct(null); setDirection('out'); setQuantity(''); setReason('counter_sale');
    setBatchNumber(''); setExpiryDate(''); setCostPrice(''); setNote('');
  }

  function changeDirection(d: 'in' | 'out') {
    setDirection(d);
    setReason(d === 'in' ? 'opening' : 'counter_sale');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!product) { toast.error('Choose a product first.'); return; }
    if (!qty || qty < 1) { toast.error('Enter a quantity of 1 or more.'); return; }
    if (direction === 'in' && !batchNumber.trim()) { toast.error('Batch number is required when adding stock.'); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        productId: product._id, direction, quantity: qty, reason, note: note.trim() || undefined,
      };
      if (direction === 'in') {
        payload.batchNumber = batchNumber.trim();
        if (expiryDate) payload.expiryDate = expiryDate;
        if (costPrice) payload.costPrice = Number(costPrice);
      }
      const res = await fetch('/api/admin/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(errorMessage(body, "Couldn't save the adjustment.")); return; }
      toast.success('Stock adjusted.');
      reset();
      setShowForm(false);
      fetchList();
    } catch {
      toast.error("Couldn't save the adjustment. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const reasons = direction === 'in' ? IN_REASONS : OUT_REASONS;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Stock adjustments"
        description="Record stock that moved outside a purchase or online order — opening stock, counter sales, wastage, recounts."
      >
        <Button type="button" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4" /> New adjustment
        </Button>
      </AdminPageHeader>

      {showForm && (
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Product *</span>
              <ProductPicker selected={product} onSelect={setProduct} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Direction *</span>
              <Select
                value={direction}
                onChange={(e) => changeDirection(e.target.value as 'in' | 'out')}
                options={[{ value: 'out', label: 'Remove stock (out)' }, { value: 'in', label: 'Add stock (in)' }]}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Reason *</span>
              <Select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                options={reasons.map((r) => ({ value: r, label: ADJUSTMENT_REASON_LABELS[r] }))}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Quantity *</span>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </label>

            {direction === 'in' && (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Batch number *</span>
                  <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} maxLength={80} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Expiry date</span>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Cost price / unit</span>
                  <Input type="number" min={0} step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                </label>
              </>
            )}

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Note</span>
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Optional — what happened" />
            </label>

            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={saving}>Save adjustment</Button>
              <Button type="button" variant="secondary" onClick={() => { setShowForm(false); reset(); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading adjustments…
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <SlidersHorizontal className="h-8 w-8 text-[var(--ink-40)]" />
            <p className="text-[var(--ink)]">No adjustments yet</p>
            <p className="max-w-sm text-sm text-[var(--ink-70)]">Use an adjustment for anything that isn&apos;t a purchase or an online order.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--foil-soft)]">
            {list.map((a) => (
              <li key={a._id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: a.direction === 'in' ? 'var(--brand-soft)' : 'var(--foil-soft)' }}
                >
                  {a.direction === 'in'
                    ? <ArrowUpRight className="h-4 w-4 text-[var(--brand-deep)]" />
                    : <ArrowDownRight className="h-4 w-4 text-[var(--ink-70)]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--ink)]">{a.productName}</p>
                  <p className="truncate text-sm text-[var(--ink-70)]">
                    {ADJUSTMENT_REASON_LABELS[a.reason] ?? a.reason}
                    {a.batchNumber ? ` · batch ${a.batchNumber}` : ''}
                    {a.note ? ` · ${a.note}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-semibold" style={{ fontFamily: 'var(--font-data)', color: a.direction === 'in' ? 'var(--brand-deep)' : 'var(--ink-70)' }}>
                    {a.direction === 'in' ? '+' : '−'}<Num value={a.quantity} />
                  </span>
                  <p className="text-xs text-[var(--ink-40)]">{formatDate(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
