'use client';

import { useState } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/store/useToastStore';

/**
 * Bulk actions for the admin products table. Reuses the Drawer primitive
 * (focus trap, Escape, scroll lock come free). Price and stock post to the
 * existing hook-safe bulk endpoints — the server recomputes unitPrice for
 * price changes, never this client.
 */
export type BulkAction = 'price' | 'stock' | 'activate' | 'deactivate';

const TITLES: Record<BulkAction, string> = {
  price: 'Set price',
  stock: 'Set stock',
  activate: 'Activate products',
  deactivate: 'Deactivate products',
};

export function BulkActionDrawer({
  action,
  selectedIds,
  onClose,
  onDone,
}: {
  action: BulkAction | null;
  selectedIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const count = selectedIds.length;
  const countLabel = count === 1 ? '1 product' : `${count} products`;

  const close = () => {
    setValue('');
    setFieldError(null);
    onClose();
  };

  const submit = async () => {
    if (!action) return;

    let url: string;
    let body: unknown;

    if (action === 'activate' || action === 'deactivate') {
      url = '/api/admin/products/bulk-active';
      body = { ids: selectedIds, isActive: action === 'activate' };
    } else {
      const parsed = Number(value);
      if (value.trim() === '' || Number.isNaN(parsed) || parsed < 0) {
        setFieldError(action === 'price' ? 'Enter a price of ₹0 or more.' : 'Enter a stock count of 0 or more.');
        return;
      }
      if (action === 'stock' && !Number.isInteger(parsed)) {
        setFieldError('Stock must be a whole number.');
        return;
      }
      url = action === 'price' ? '/api/admin/products/bulk-price' : '/api/admin/products/bulk-stock';
      body = {
        updates: selectedIds.map((id) =>
          action === 'price' ? { id, price: Math.round(parsed * 100) / 100 } : { id, stock: parsed }
        ),
      };
    }

    setSubmitting(true);
    setFieldError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.error || 'Bulk update failed');

      const updated: number = json.data?.updated ?? 0;
      const skipped: string[] = json.data?.skipped ?? [];
      toast.success(
        skipped.length > 0
          ? `Updated ${updated} of ${count} products — ${skipped.length} skipped (not found)`
          : `Updated ${updated === 1 ? '1 product' : `${updated} products`}`
      );
      setValue('');
      onDone();
    } catch (err) {
      console.error('Bulk action failed:', err);
      toast.error("Couldn't update the selected products. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={action !== null} onClose={close} title={action ? TITLES[action] : ''} side="right">
      {action && (
        <div className="flex h-full flex-col gap-5 p-4">
          <p className="text-[length:var(--step--1)] text-[var(--ink-70)]">
            {action === 'price' && (
              <>
                Sets the same pack price for <span className="data font-semibold">{countLabel}</span>.
                The price per tablet/ml is recomputed on the server for each pack size.
              </>
            )}
            {action === 'stock' && (
              <>
                Sets the same stock count for <span className="data font-semibold">{countLabel}</span>.
              </>
            )}
            {action === 'activate' && (
              <>
                <span className="data font-semibold">{countLabel}</span> will become visible on the
                storefront again.
              </>
            )}
            {action === 'deactivate' && (
              <>
                <span className="data font-semibold">{countLabel}</span> will disappear from the
                storefront. Existing orders are not affected.
              </>
            )}
          </p>

          {(action === 'price' || action === 'stock') && (
            <div>
              <label
                htmlFor="bulk-action-value"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                {action === 'price' ? 'New price (₹, per pack)' : 'New stock count'}
              </label>
              <Input
                id="bulk-action-value"
                type="number"
                inputMode="decimal"
                min={0}
                step={action === 'price' ? '0.01' : '1'}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setFieldError(null);
                }}
                className="data"
              />
              {fieldError && (
                <p role="alert" className="mt-1.5 text-sm font-medium text-[var(--ink)]">
                  {fieldError}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto flex gap-2">
            <Button variant="outline" onClick={close} disabled={submitting} className="h-11 flex-1">
              Cancel
            </Button>
            <Button
              onClick={submit}
              loading={submitting}
              className="h-11 flex-1 bg-[var(--mint)] font-semibold text-[var(--paper-card)] hover:bg-[var(--mint-deep)]"
            >
              {TITLES[action]}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
