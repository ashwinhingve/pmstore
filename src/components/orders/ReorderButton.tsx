'use client';

import { useState } from 'react';
import { RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { toast } from '@/store/useToastStore';

interface AddedItem {
  productId: string;
  name: string;
  slug: string;
  quantity: number;
  price: number;
  priceChanged: boolean;
  previousPrice: number;
  quantityAdjusted: boolean;
}

interface SkippedItem {
  productId: string;
  name: string;
  reason: 'unavailable' | 'out_of_stock' | 'prescription_required';
}

const SKIP_LABEL: Record<SkippedItem['reason'], string> = {
  unavailable: 'no longer available',
  out_of_stock: 'out of stock',
  prescription_required: 'now needs a prescription',
};

/**
 * One-tap reorder. Asks the server which lines of a past order can go back in
 * the cart today (see /api/orders/[orderId]/reorder), adds those to the client
 * cart, and shows what was left out and why. The cart lives client-side, so the
 * server only decides — this component does the adding.
 */
export function ReorderButton({ orderId }: { orderId: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [added, setAdded] = useState<AddedItem[]>([]);
  const [skipped, setSkipped] = useState<SkippedItem[]>([]);
  const [message, setMessage] = useState('');

  async function handleReorder() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, { method: 'POST' });
      if (res.status === 401) {
        setStatus('error');
        setMessage('Please sign in to reorder.');
        return;
      }
      if (!res.ok) {
        setStatus('error');
        setMessage('Could not reorder right now. Please try again.');
        return;
      }
      const json = (await res.json()) as { data: { added: AddedItem[]; skipped: SkippedItem[] } };
      const { added: addedItems, skipped: skippedItems } = json.data;

      for (const item of addedItems) {
        addItem(
          { _id: item.productId, name: item.name, slug: item.slug, price: item.price, images: [], category: '' },
          item.quantity
        );
      }

      setAdded(addedItems);
      setSkipped(skippedItems);
      setStatus('done');
      if (addedItems.length > 0) {
        toast.success(
          addedItems.length === 1 ? '1 item added to cart' : `${addedItems.length} items added to cart`
        );
      }
    } catch {
      setStatus('error');
      setMessage('Could not reorder right now. Please try again.');
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleReorder}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--mint)] px-4 py-2 text-[length:var(--step--1)] font-semibold text-[var(--ink)] transition hover:opacity-90 disabled:opacity-60"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {status === 'loading' ? 'Adding to cart…' : 'Reorder'}
      </button>

      {status === 'error' && (
        <p className="text-[length:var(--step--1)] font-semibold text-[var(--ink)]" role="alert">
          {message}
        </p>
      )}

      {status === 'done' && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-3 text-[length:var(--step--1)]">
          {added.length > 0 ? (
            <p className="flex items-center gap-2 font-medium text-[var(--ink)]">
              <Check className="h-4 w-4 text-[var(--mint-ink,var(--ink))]" aria-hidden="true" />
              Added {added.length} item{added.length !== 1 ? 's' : ''} to your cart.
              {' '}
              <a href="/cart" className="underline">View cart</a>
            </p>
          ) : (
            <p className="text-[var(--ink)]">Nothing from this order could be re-added.</p>
          )}

          {added.some((a) => a.priceChanged || a.quantityAdjusted) && (
            <ul className="mt-2 space-y-1 text-[var(--ink-soft,var(--ink))]">
              {added
                .filter((a) => a.priceChanged || a.quantityAdjusted)
                .map((a) => (
                  <li key={a.productId}>
                    {a.name}
                    {a.priceChanged && ` — price is now ₹${a.price.toFixed(2)} (was ₹${a.previousPrice.toFixed(2)})`}
                    {a.quantityAdjusted && ` — only ${a.quantity} in stock`}
                  </li>
                ))}
            </ul>
          )}

          {skipped.length > 0 && (
            <div className="mt-2">
              <p className="flex items-center gap-2 font-medium text-[var(--ink)]">
                <AlertTriangle className="h-4 w-4 text-[var(--ink-70)]" aria-hidden="true" />
                Left out:
              </p>
              <ul className="mt-1 space-y-1 text-[var(--ink-soft,var(--ink))]">
                {skipped.map((s) => (
                  <li key={s.productId}>
                    {s.name} — {SKIP_LABEL[s.reason]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
