'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ParcelMeasurements } from '@/lib/shipping/parcel';

interface Props {
  orderId: string;
  orderNumber: string;
  paymentMethod?: string;
  manual?: boolean;
  initialParcel?: ParcelMeasurements;
  bookingState?: string;
}

export default function CreateShipmentButton({ orderId, orderNumber, paymentMethod, manual, initialParcel, bookingState }: Props) {
  const router = useRouter();
  const id = useId();
  const [provider, setProvider] = useState<'delhivery' | 'shiprocket'>('delhivery');
  const [values, setValues] = useState<Record<keyof ParcelMeasurements, string>>({
    weightGrams: initialParcel ? String(initialParcel.weightGrams) : '',
    lengthCm: initialParcel ? String(initialParcel.lengthCm) : '',
    widthCm: initialParcel ? String(initialParcel.widthCm) : '',
    heightCm: initialParcel ? String(initialParcel.heightCm) : '',
  });
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [estimate, setEstimate] = useState<number | null>(null);
  const [waybill, setWaybill] = useState('');

  async function submit(book: boolean) {
    setBusy(true);
    setMessage('');
    try {
      const parcel = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)]));
      const response = await fetch(book ? '/api/shipping/create' : '/api/shipping/parcel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book ? { orderId, provider } : { orderId, provider, parcel, action: 'estimate' }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Unable to process shipment. Refresh and try again.');
      if (book) {
        setWaybill(data.waybill);
        router.refresh();
      } else {
        setConfirmed(true);
        setEstimate(data.estimate?.total ?? null);
        setMessage(data.message || 'Packed measurements confirmed. Review the estimate before booking.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to process shipment.');
    } finally {
      setBusy(false);
    }
  }

  if (waybill) return <p role="status" className="text-sm text-[var(--ink)]">Shipment created: {waybill}</p>;

  if (bookingState === 'creating' || bookingState === 'uncertain') {
    return <p role="status" className="text-sm text-[var(--ink)]">Booking is in progress or needs reconciliation. Check the courier dashboard for {orderNumber} before retrying.</p>;
  }

  const fields: Array<[keyof ParcelMeasurements, string]> = [
    ['weightGrams', 'Total packed weight (g)'], ['lengthCm', 'Length (cm)'],
    ['widthCm', 'Width (cm)'], ['heightCm', 'Height (cm)'],
  ];
  return (
    <section aria-label={`Book shipment for ${orderNumber}`} className="rounded-lg border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--ink)]">{manual ? 'Local delivery' : 'Confirm parcel and book shipment'}</h3>
      {!manual && <>
        <p className="text-sm text-[var(--ink-70)]">Weigh the complete parcel, including packaging. Product weights are not used for courier booking.</p>
        <label htmlFor={`${id}-provider`} className="block text-sm">Courier</label>
        <select id={`${id}-provider`} value={provider} disabled={busy} onChange={(e) => { setProvider(e.target.value as typeof provider); setConfirmed(false); setEstimate(null); }} className="min-h-11 rounded border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 text-sm">
          <option value="delhivery">Delhivery Surface</option><option value="shiprocket">Shiprocket</option>
        </select>
        <form onSubmit={(e) => { e.preventDefault(); void submit(false); }} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(([key, label]) => <div key={key}>
              <label htmlFor={`${id}-${key}`} className="block text-sm mb-1">{label}</label>
              <input id={`${id}-${key}`} type="number" min={key === 'weightGrams' ? '1' : '0.1'} max={key === 'weightGrams' ? '1000000' : '1000'} step={key === 'weightGrams' ? '1' : '0.1'} required disabled={busy} value={values[key]} onChange={(e) => { setValues({ ...values, [key]: e.target.value }); setConfirmed(false); setEstimate(null); }} className="min-h-11 w-full rounded border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 text-sm data" />
            </div>)}
          </div>
          <button type="submit" disabled={busy} className="min-h-11 rounded border border-[var(--foil-soft)] px-3 text-sm disabled:opacity-50">Confirm parcel and estimate</button>
        </form>
        <p className="text-sm text-[var(--ink-70)]">{paymentMethod === 'cod' ? 'COD' : 'Prepaid'} · Courier estimate: {estimate === null ? 'unavailable' : `₹${estimate.toFixed(2)} (including provider taxes)`}. Final billing may differ after courier measurement. Customer delivery fees stay unchanged.</p>
      </>}
      {message && <p role="status" className="text-sm text-[var(--ink)]">{message}</p>}
      <button type="button" disabled={busy || (!manual && !confirmed)} onClick={() => void submit(true)} className="min-h-11 rounded bg-[var(--ink)] text-[var(--paper-card)] px-4 text-sm font-semibold disabled:opacity-50">{busy ? 'Please wait…' : manual ? 'Create local delivery' : 'Book shipment'}</button>
    </section>
  );
}
