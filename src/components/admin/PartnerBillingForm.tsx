'use client';
import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';

interface BillingData { amount: number; reference: string; source: 'wallet' | 'invoice'; status: 'paid' | 'unpaid'; chargeDate: string; }
export default function PartnerBillingForm({ shipmentId, waybill, initialData, initialVersion = 0 }: { shipmentId: string; waybill: string; initialData?: BillingData; initialVersion?: number }) {
  const [billing, setBilling] = useState(initialData);
  const [version, setVersion] = useState(initialVersion);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const id = useId(); const router = useRouter();
  const currentBilling = initialVersion > version ? initialData : billing;
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/shipments/${shipmentId}/billing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(data.get('amount')), reference: data.get('reference'), source: data.get('source'), status: data.get('status'), chargeDate: new Date(String(data.get('date'))).toISOString(), expectedVersion: Math.max(version, initialVersion), verified: data.get('verified') === 'on' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : result.error?.message || 'Unable to record billing.');
      setBilling(result.billing); setVersion(result.version); setMessage('Verified partner charge recorded. Customer totals are unchanged.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to record billing.'); }
    finally { setBusy(false); }
  }
  const inputClass = 'min-h-11 w-full rounded border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 py-2';
  return <section className="rounded-lg border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 space-y-3 text-sm">
    <h3 className="font-semibold">Actual courier billing · AWB {waybill}</h3>
    <p>{currentBilling ? `Recorded charge: ₹${currentBilling.amount.toFixed(2)} · ${currentBilling.status} · ${currentBilling.reference}` : 'Final partner charge pending verification.'}</p>
    <p className="text-[var(--ink-70)]">Enter the verified wallet or invoice amount. This records the business expense; it does not make a payment or change the customer delivery fee.</p>
    <form key={initialVersion} onSubmit={save}><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <div><label htmlFor={`${id}-amount`}>Actual charge (₹)</label><input id={`${id}-amount`} name="amount" type="number" min="0" step="0.01" required defaultValue={initialData?.amount} className={inputClass} /></div>
      <div><label htmlFor={`${id}-ref`}>Wallet or invoice reference</label><input id={`${id}-ref`} name="reference" required minLength={3} maxLength={200} defaultValue={initialData?.reference} className={inputClass} /></div>
      <div><label htmlFor={`${id}-source`}>Source</label><select id={`${id}-source`} name="source" defaultValue={initialData?.source ?? 'wallet'} className={inputClass}><option value="wallet">Wallet debit</option><option value="invoice">Invoice</option></select></div>
      <div><label htmlFor={`${id}-status`}>Payment status</label><select id={`${id}-status`} name="status" defaultValue={initialData?.status ?? 'paid'} className={inputClass}><option value="paid">Paid by business</option><option value="unpaid">Invoice awaiting payment</option></select></div>
      <div><label htmlFor={`${id}-date`}>Charge date</label><input id={`${id}-date`} name="date" type="date" required defaultValue={initialData?.chargeDate.slice(0, 10)} className={inputClass} /></div>
      <label className="flex items-center gap-2 min-h-11"><input name="verified" type="checkbox" required /> I verified this amount against the courier billing record.</label>
      <button type="submit" className="min-h-11 rounded bg-[var(--ink)] px-4 text-[var(--paper-card)]">Record verified charge</button>
    </fieldset></form>
    {message && <p role="status">{message}</p>}
  </section>;
}
