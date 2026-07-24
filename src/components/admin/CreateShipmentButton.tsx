'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  orderNumber: string;
  paymentMethod?: string;
}

export default function CreateShipmentButton({ orderId, orderNumber, paymentMethod }: Props) {
  const router = useRouter();
  const [provider, setProvider] = useState<'delhivery' | 'shiprocket'>('delhivery');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ waybill: string; trackingUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/shipping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, provider }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult({ waybill: data.waybill, trackingUrl: data.trackingUrl });
        router.refresh();
      } else {
        setError(data.error || data.message || 'Failed to create shipment');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--mint-soft)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--mint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[var(--mint)]">Shipment created</h3>
        </div>
        <p className="text-sm text-[var(--ink-70)] mb-1">Waybill</p>
        <p className="text-sm data font-semibold text-[var(--ink)] mb-3" style={{ fontFamily: 'var(--font-data)' }}>{result.waybill}</p>
        {result.trackingUrl && (
          <a
            href={result.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
          >
            Track shipment
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    );
  }

  const isCod = paymentMethod === 'cod';

  return (
    <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-[var(--ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="text-sm font-semibold text-[var(--ink)]">Create shipment</h3>
      </div>
      <p className="text-xs text-[var(--ink-70)] mb-4">
        {isCod ? 'COD order — select courier to dispatch' : 'Select courier to create shipment'}
      </p>

      {/* Provider radio cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['delhivery', 'shiprocket'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setProvider(p)}
            disabled={loading}
            className={`relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-medium transition-all ${
              provider === p
                ? p === 'shiprocket'
                  ? 'border-[var(--ink)] bg-[var(--foil-soft)] text-[var(--ink)]'
                  : 'border-[var(--ink)] bg-[var(--foil-soft)] text-[var(--ink)]'
                : 'border-[var(--foil-soft)] bg-[var(--paper-card)] text-[var(--ink-70)] hover:border-[var(--ink)]'
            }`}
          >
            <span className="text-lg">
              {p === 'delhivery' ? '🔵' : '🟠'}
            </span>
            {p === 'delhivery' ? 'Delhivery' : 'Shiprocket'}
            {provider === p && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-current opacity-70" />
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="w-full py-2.5 bg-[var(--ink)] text-[var(--paper-card)] text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Creating shipment...' : `Ship with ${provider === 'delhivery' ? 'Delhivery' : 'Shiprocket'}`}
      </button>

      {error && (
        <p className="mt-2 text-xs text-[var(--ink)]">{error}</p>
      )}
    </div>
  );
}
