'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/store/useToastStore';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Money, Num, errorMessage } from '@/components/admin/inventory/shared';
import { ProductPicker, type PickedProduct } from '@/components/admin/inventory/ProductPicker';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface SupplierOption { _id: string; name: string }
interface Line {
  productId: string; productName: string; batchNumber: string; expiryDate: string;
  quantity: number; freeQuantity: number; costPrice: number; mrp?: number; gstRate?: number;
}

const GST_OPTIONS = [0, 5, 12, 18, 28].map((v) => ({ value: String(v), label: `${v}%` }));

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState<'draft' | 'received' | null>(null);

  // Line builder state
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [freeQuantity, setFreeQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [gstRate, setGstRate] = useState('5');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/inventory/suppliers?active=true');
        const body = await res.json();
        if (res.ok) setSuppliers(body.data ?? []);
      } catch { /* handled inline */ }
    })();
  }, []);

  // Prefill MRP/GST when a product is chosen.
  useEffect(() => {
    if (!product) return;
    if (product.mrp != null) setMrp(String(product.mrp));
    if (product.gstRate != null) setGstRate(String(product.gstRate));
  }, [product]);

  function resetLineBuilder() {
    setProduct(null); setBatchNumber(''); setExpiryDate(''); setQuantity('');
    setFreeQuantity(''); setCostPrice(''); setMrp(''); setGstRate('5');
  }

  function addLine() {
    const qty = Number(quantity);
    if (!product) { toast.error('Choose a product first.'); return; }
    if (!batchNumber.trim()) { toast.error('Enter a batch number.'); return; }
    if (!qty || qty < 1) { toast.error('Enter a quantity of 1 or more.'); return; }
    if (costPrice === '' || Number(costPrice) < 0) { toast.error('Enter the cost price.'); return; }

    setLines((prev) => [
      ...prev,
      {
        productId: product._id, productName: product.name,
        batchNumber: batchNumber.trim(), expiryDate,
        quantity: qty, freeQuantity: Number(freeQuantity) || 0,
        costPrice: Number(costPrice), mrp: mrp ? Number(mrp) : undefined,
        gstRate: Number(gstRate),
      },
    ]);
    resetLineBuilder();
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(status: 'draft' | 'received') {
    if (!supplierId) { toast.error('Choose a supplier.'); return; }
    if (lines.length === 0) { toast.error('Add at least one item.'); return; }
    setSaving(status);
    try {
      const res = await fetch('/api/admin/inventory/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          invoiceNumber: invoiceNumber.trim() || undefined,
          invoiceDate: invoiceDate || undefined,
          status,
          paymentStatus,
          amountPaid: amountPaid ? Number(amountPaid) : 0,
          notes: notes.trim() || undefined,
          items: lines.map((l) => ({
            productId: l.productId, productName: l.productName,
            batchNumber: l.batchNumber, expiryDate: l.expiryDate || undefined,
            quantity: l.quantity, freeQuantity: l.freeQuantity,
            costPrice: l.costPrice, mrp: l.mrp, gstRate: l.gstRate,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(errorMessage(body, "Couldn't save the purchase.")); return; }
      toast.success(status === 'received' ? 'Purchase received — stock updated.' : 'Purchase saved as draft.');
      router.push(`/admin/inventory/purchases/${body.data._id}`);
    } catch {
      toast.error("Couldn't save the purchase. Try again.");
    } finally {
      setSaving(null);
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.costPrice, 0);
  const tax = lines.reduce((s, l) => s + l.quantity * l.costPrice * ((l.gstRate ?? 0) / 100), 0);
  const total = subtotal + tax;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory/purchases" className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--ink-70)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-4 w-4" /> Back to purchases
        </Link>
        <AdminPageHeader title="New purchase" description="Record stock coming in from a supplier. Receive it now to update stock, or save a draft." />
      </div>

      {/* Header fields */}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Supplier *</span>
            <Select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={[{ value: '', label: 'Choose a supplier…' }, ...suppliers.map((s) => ({ value: s._id, label: s.name }))]}
            />
            {suppliers.length === 0 && (
              <span className="mt-1 block text-xs text-[var(--ink-40)]">
                No suppliers yet — <Link href="/admin/inventory/suppliers" className="underline">add one first</Link>.
              </span>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Invoice no.</span>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} maxLength={60} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Invoice date</span>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Payment</span>
            <Select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              options={[{ value: 'unpaid', label: 'Unpaid' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }]}
            />
          </label>
        </div>
      </Card>

      {/* Line builder */}
      <Card className="p-5">
        <h2 className="mb-3 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">Add an item</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Product</span>
            <ProductPicker selected={product} onSelect={setProduct} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Batch number</span>
            <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} maxLength={80} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Expiry date</span>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Quantity</span>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Free qty</span>
            <Input type="number" min={0} value={freeQuantity} onChange={(e) => setFreeQuantity(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Cost / unit</span>
            <Input type="number" min={0} step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">MRP</span>
            <Input type="number" min={0} step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">GST</span>
            <Select value={gstRate} onChange={(e) => setGstRate(e.target.value)} options={GST_OPTIONS} />
          </label>
        </div>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addLine}>
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </Card>

      {/* Lines */}
      {lines.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--foil-soft)] text-left text-xs uppercase tracking-wide text-[var(--ink-40)]">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 text-right font-semibold">Qty (+free)</th>
                  <th className="px-4 py-3 text-right font-semibold">Cost</th>
                  <th className="px-4 py-3 text-right font-semibold">GST</th>
                  <th className="px-4 py-3 text-right font-semibold">Line total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--foil-soft)]">
                {lines.map((l, i) => (
                  <tr key={i} className="text-[var(--ink)]">
                    <td className="px-4 py-2.5">{l.productName}</td>
                    <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-data)' }}>{l.batchNumber}</td>
                    <td className="px-4 py-2.5 text-right"><Num value={l.quantity} />{l.freeQuantity ? ` (+${l.freeQuantity})` : ''}</td>
                    <td className="px-4 py-2.5 text-right"><Money value={l.costPrice} /></td>
                    <td className="px-4 py-2.5 text-right" style={{ fontFamily: 'var(--font-data)' }}>{l.gstRate ?? 0}%</td>
                    <td className="px-4 py-2.5 text-right"><Money value={l.quantity * l.costPrice} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => removeLine(i)} aria-label="Remove line" className="text-[var(--ink-40)] hover:text-[var(--ink)]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Footer / totals / actions */}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Amount paid</span>
              <Input type="number" min={0} step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Notes</span>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </label>
          </div>
          <div className="space-y-1.5 sm:text-right">
            <p className="text-sm text-[var(--ink-70)]">Subtotal: <Money value={subtotal} /></p>
            <p className="text-sm text-[var(--ink-70)]">GST: <Money value={tax} /></p>
            <p className="text-[length:var(--step-1)] font-bold text-[var(--ink)]">Total: <Money value={total} /></p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" loading={saving === 'draft'} disabled={!!saving} onClick={() => submit('draft')}>
            Save as draft
          </Button>
          <Button type="button" loading={saving === 'received'} disabled={!!saving} onClick={() => submit('received')}>
            Receive now
          </Button>
        </div>
      </Card>
    </div>
  );
}
