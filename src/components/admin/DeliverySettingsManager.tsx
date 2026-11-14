'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DeliveryPolicy, PickupLocation } from '@/lib/shipping/delivery-policy';

export default function DeliverySettingsManager({ initialData }: { initialData: DeliveryPolicy }) {
  const [policy, setPolicy] = useState(initialData);
  const [pinInputs, setPinInputs] = useState<Record<string, string>>(() => Object.fromEntries(initialData.pickupLocations.map(pickup => [pickup.id, pickup.freeDeliveryPincodes.join(', ')])));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const id = useId();
  const router = useRouter();
  function updatePickup(index: number, changes: Partial<PickupLocation>) {
    setPolicy(previous => ({ ...previous, pickupLocations: previous.pickupLocations.map((pickup, i) => i === index ? { ...pickup, ...changes } : pickup) }));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const delivery = { ...policy, pickupLocations: policy.pickupLocations.map(pickup => ({ ...pickup, freeDeliveryPincodes: (pinInputs[pickup.id] ?? '').split(/[\s,;]+/).filter(Boolean) })) };
      const response = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delivery }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Unable to save delivery settings.');
      setPolicy(data.settings.delivery); setMessage('Delivery settings saved. Existing orders keep their original delivery fees and pickup details.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save delivery settings.'); }
    finally { setBusy(false); }
  }
  const fields: Array<[keyof Pick<PickupLocation, 'name' | 'delhiveryWarehouse' | 'shiprocketWarehouse' | 'pincode' | 'address' | 'city' | 'state' | 'phone'>, string]> = [
    ['name', 'Location name'], ['delhiveryWarehouse', 'Registered Delhivery warehouse name'], ['shiprocketWarehouse', 'Registered Shiprocket pickup name (optional)'], ['pincode', 'Origin PIN'], ['address', 'Pickup address'], ['city', 'City'], ['state', 'State'], ['phone', 'Pickup phone'],
  ];
  const inputClass = 'min-h-11 w-full rounded border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 py-2 text-sm';
  return <form onSubmit={save} className="rounded-lg border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5 space-y-5">
    <h2 className="text-lg font-semibold">Delivery locations and free delivery</h2>
    <p className="text-sm text-[var(--ink-70)]">Register pickup locations with the courier first. The store chooses one default dispatch location. Existing ₹499 and local delivery offers continue to apply.</p>
    <fieldset disabled={busy} className="space-y-5">
      <label className="flex items-center gap-2 min-h-11"><input type="checkbox" checked={policy.freeDelivery.enabled} onChange={event => setPolicy({ ...policy, freeDelivery: { ...policy.freeDelivery, enabled: event.target.checked } })} /> Enable free delivery to selected PINs</label>
      <label htmlFor={`${id}-default`} className="block text-sm">Default dispatch location</label>
      <select id={`${id}-default`} className={inputClass} value={policy.defaultPickupLocationId} onChange={event => setPolicy({ ...policy, defaultPickupLocationId: event.target.value })}>
        <option value="">No configured pickup location</option>
        {policy.pickupLocations.filter(pickup => pickup.active).map(pickup => <option key={pickup.id} value={pickup.id}>{pickup.name || 'Unnamed location'} · {pickup.pincode}</option>)}
      </select>
      {policy.pickupLocations.map((pickup, index) => <fieldset key={pickup.id} className="rounded border border-[var(--foil-soft)] p-4 space-y-3">
        <legend className="px-2 text-sm font-semibold">Pickup {index + 1}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label]) => <div key={key}><label htmlFor={`${id}-${pickup.id}-${key}`} className="block text-sm mb-1">{label}</label><input id={`${id}-${pickup.id}-${key}`} className={inputClass} value={pickup[key]} required={key !== 'shiprocketWarehouse' && key !== 'delhiveryWarehouse'} onChange={event => updatePickup(index, { [key]: event.target.value })} /></div>)}
        </div>
        <label className="flex items-center gap-2 min-h-11"><input type="checkbox" checked={pickup.active} onChange={event => updatePickup(index, { active: event.target.checked })} /> Active pickup location</label>
        <label htmlFor={`${id}-${pickup.id}-pins`} className="block text-sm">Eligible destination PINs (comma or newline separated)</label>
        <textarea id={`${id}-${pickup.id}-pins`} className={inputClass} value={pinInputs[pickup.id] ?? ''} onChange={event => setPinInputs({ ...pinInputs, [pickup.id]: event.target.value })} rows={3} />
        <button type="button" className="min-h-11 px-3 text-sm underline" onClick={() => { setPolicy({ ...policy, pickupLocations: policy.pickupLocations.filter(item => item.id !== pickup.id), defaultPickupLocationId: policy.defaultPickupLocationId === pickup.id ? '' : policy.defaultPickupLocationId }); }}>Remove pickup</button>
      </fieldset>)}
      <button type="button" className="min-h-11 rounded border border-[var(--foil-soft)] px-4 text-sm" onClick={() => setPolicy({ ...policy, pickupLocations: [...policy.pickupLocations, { id: crypto.randomUUID(), name: '', active: true, delhiveryWarehouse: '', shiprocketWarehouse: '', pincode: '', address: '', city: '', state: '', country: 'India', phone: '', freeDeliveryPincodes: [] }] })}>Add pickup location</button>
      <label className="flex items-center gap-2 min-h-11"><input type="checkbox" checked={policy.freeDelivery.showInBanner} onChange={event => setPolicy({ ...policy, freeDelivery: { ...policy.freeDelivery, showInBanner: event.target.checked } })} /> Promote the enabled offer in the announcement banner</label>
      <label htmlFor={`${id}-message`} className="block text-sm">Free delivery announcement (mention selected or eligible locations)</label>
      <input id={`${id}-message`} className={inputClass} value={policy.freeDelivery.bannerText} maxLength={250} required onChange={event => setPolicy({ ...policy, freeDelivery: { ...policy.freeDelivery, bannerText: event.target.value } })} />
      <button type="submit" className="min-h-11 rounded bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper-card)]">Save delivery settings</button>
    </fieldset>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
