'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/store/useToastStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Money, Num, errorMessage, RETURN_REASON_LABELS } from '@/components/admin/inventory/shared';
import { ProductPicker, type PickedProduct } from '@/components/admin/inventory/ProductPicker';
import { formatExpiry } from '@/lib/pharma/expiry';
import { formatDate } from '@/lib/utils/format-date';
import { Plus, Trash2, Loader2, RotateCcw } from 'lucide-react';

interface SupplierOption { _id: string; name: string }
interface Batch { _id: string; batchNumber: string; expiryDate?: string; quantityRemaining: number; costPrice: number }
interface ReturnLine {
  productId: string; productName: string; batchId?: string; batchNumber?: string;
  quantity: number; costPrice: number; reason: string;
}
interface ReturnRow {
  _id: string; returnNumber: string; supplierName: string; total: number; itemCount: number; createdAt: string;
}

const REASONS = ['expired', 'near_expiry', 'damaged', 'wrong_item', 'overstock', 'other'];

export default function PurchaseReturnsPage() {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [list, setList] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<ReturnLine[]>([]);

  // Line builder
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [reason, setReason] = useState('expired');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inventory/returns?limit=30');
      const body = await res.json();
      if (res.ok) setList(body.data ?? []);
      else toast.error(errorMessage(body, "Couldn't load returns."));
    } catch {
      toast.error("Couldn't load returns. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/inventory/suppliers?active=true');
        const body = await res.json();
        if (res.ok) setSuppliers(body.data ?? []);
      } catch { /* handled by inline empty state */ }
    })();
  }, []);

  // When a product is picked, load its live batches.
  useEffect(() => {
    if (!product) { setBatches([]); setBatchId(''); setCostPrice(''); return; }
    (async () => {
      try {
        const res = await fetch(`/api/admin/inventory/stock?productId=${product._id}`);
        const body = await res.json();
        if (res.ok) setBatches(body.data?.[0]?.batches ?? []);
      } catch { /* leave batches empty — FEFO fallback */ }
    })();
  }, [product]);

  function onBatchChange(id: string) {
    setBatchId(id);
    const b = batches.find((x) => x._id === id);
    if (b) setCostPrice(String(b.costPrice));
  }

  function addLine() {
    const qty = Number(quantity);
    if (!product) { toast.error('Choose a product first.'); return; }
    if (!qty || qty < 1) { toast.error('Enter a quantity of 1 or more.'); return; }
    const cost = Number(costPrice) || 0;
    const batch = batches.find((b) => b._id === batchId);
    setLines((prev) => [
      ...prev,
      {
        productId: product._id, productName: product.name,
        batchId: batch?._id, batchNumber: batch?.batchNumber,
        quantity: qty, costPrice: cost, reason,
      },
    ]);
    setProduct(null); setBatches([]); setBatchId(''); setQuantity(''); setCostPrice(''); setReason('expired');
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!supplierId) { toast.error('Choose a supplier.'); return; }
    if (lines.length === 0) { toast.error('Add at least one item to return.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/inventory/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          purchaseNumber: purchaseNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          items: lines.map((l) => ({
            productId: l.productId, productName: l.productName,
            batchId: l.batchId, batchNumber: l.batchNumber,
            quantity: l.quantity, costPrice: l.costPrice, reason: l.reason,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(errorMessage(body, "Couldn't create the return.")); return; }
      toast.success(`Return ${body.data?.returnNumber} created — stock updated.`);
      setSupplierId(''); setPurchaseNumber(''); setNotes(''); setLines([]); setShowForm(false);
      fetchList();
    } catch {
      toast.error("Couldn't create the return. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.costPrice, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Purchase returns"
        description="Send stock back to a supplier — expired, damaged or wrong items. This lowers stock."
      >
        <Button type="button" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4" /> New return
        </Button>
      </AdminPageHeader>

      {showForm && (
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Supplier *</span>
              <Select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={[{ value: '', label: 'Choose a supplier…' }, ...suppliers.map((s) => ({ value: s._id, label: s.name }))]}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Against purchase no. (optional)</span>
              <Input value={purchaseNumber} onChange={(e) => setPurchaseNumber(e.target.value)} placeholder="e.g., PUR-202609-0001" />
            </label>
          </div>

          {/* Line builder */}
          <div className="mt-5 rounded-[var(--radius-sm)] border border-dashed border-[var(--foil-soft)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--ink)]">Add an item to return</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Product</span>
                <ProductPicker selected={product} onSelect={setProduct} />
              </label>
              {product && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Batch</span>
                  <Select
                    value={batchId}
                    onChange={(e) => onBatchChange(e.target.value)}
                    options={[
                      { value: '', label: batches.length ? 'Earliest expiry (FEFO)' : 'No batches — FEFO' },
                      ...batches.map((b) => ({
                        value: b._id,
                        label: `${b.batchNumber}${b.expiryDate ? ` · exp ${formatExpiry(b.expiryDate)}` : ''} · ${b.quantityRemaining} left`,
                      })),
                    ]}
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Quantity</span>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Cost / unit</span>
                <Input type="number" min={0} step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Reason</span>
                <Select value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS.map((r) => ({ value: r, label: RETURN_REASON_LABELS[r] }))} />
              </label>
            </div>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addLine}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>

          {/* Lines */}
          {lines.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[var(--ink-40)]">
                    <th className="pb-2 pr-4 font-semibold">Product</th>
                    <th className="pb-2 pr-4 font-semibold">Batch</th>
                    <th className="pb-2 pr-4 text-right font-semibold">Qty</th>
                    <th className="pb-2 pr-4 text-right font-semibold">Cost</th>
                    <th className="pb-2 pr-4 font-semibold">Reason</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--foil-soft)]">
                  {lines.map((l, i) => (
                    <tr key={i} className="text-[var(--ink)]">
                      <td className="py-2 pr-4">{l.productName}</td>
                      <td className="py-2 pr-4" style={{ fontFamily: 'var(--font-data)' }}>{l.batchNumber ?? 'FEFO'}</td>
                      <td className="py-2 pr-4 text-right"><Num value={l.quantity} /></td>
                      <td className="py-2 pr-4 text-right"><Money value={l.costPrice} /></td>
                      <td className="py-2 pr-4 text-[var(--ink-70)]">{RETURN_REASON_LABELS[l.reason]}</td>
                      <td className="py-2 text-right">
                        <button type="button" onClick={() => removeLine(i)} aria-label="Remove line" className="text-[var(--ink-40)] hover:text-[var(--ink)]">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Notes</span>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Optional" />
          </label>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-[var(--ink-70)]">Total: <Money value={total} className="font-semibold text-[var(--ink)]" /></p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="button" loading={saving} onClick={handleSubmit} disabled={lines.length === 0 || !supplierId}>Create return</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[var(--ink-70)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading returns…
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <RotateCcw className="h-8 w-8 text-[var(--ink-40)]" />
            <p className="text-[var(--ink)]">No purchase returns yet</p>
            <p className="max-w-sm text-sm text-[var(--ink-70)]">Return expired or damaged stock to a supplier and it&apos;ll be recorded here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--foil-soft)]">
            {list.map((r) => (
              <li key={r._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--font-data)' }}>{r.returnNumber}</p>
                  <p className="truncate text-sm text-[var(--ink-70)]">{r.supplierName} · {r.itemCount} item{r.itemCount === 1 ? '' : 's'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Money value={r.total} className="font-semibold text-[var(--ink)]" />
                  <p className="text-xs text-[var(--ink-40)]">{formatDate(r.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
