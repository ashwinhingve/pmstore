'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  provider: 'delhivery' | 'shiprocket';
  pickupId?: string | null;
  pickupScheduledDate?: string | null;
}

const COURIER_LABEL: Record<Props['provider'], string> = {
  delhivery: 'Delhivery',
  shiprocket: 'Shiprocket',
};

export default function RequestPickupButton({
  orderId,
  provider,
  pickupId,
  pickupScheduledDate,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ pickupId?: string; scheduledDate?: string; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const courier = COURIER_LABEL[provider];

  async function handleRequest() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/shipping/request-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult({ pickupId: data.pickupId, scheduledDate: data.scheduledDate, message: data.message });
        router.refresh();
      } else {
        setError(data.error || data.message || 'Could not request pickup — try again');
      }
    } catch {
      setError('Network error — check your connection and try again');
    } finally {
      setLoading(false);
    }
  }

  // Already scheduled (from the DB, or just now).
  const scheduledId = pickupId || result?.pickupId;
  const scheduledDate = pickupScheduledDate || result?.scheduledDate;
  const isScheduled = Boolean(pickupId) || Boolean(result);

  if (isScheduled) {
    return (
      <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--brand-soft)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[var(--brand)]">Pickup scheduled</h3>
        </div>
        <p className="text-sm text-[var(--ink-70)] mb-3">{courier} will collect this parcel.</p>
        {scheduledId && (
          <>
            <p className="text-sm text-[var(--ink-70)] mb-1">Pickup id</p>
            <p
              className="text-sm font-semibold text-[var(--ink)] mb-3"
              style={{ fontFamily: 'var(--font-data)' }}
            >
              {scheduledId}
            </p>
          </>
        )}
        {scheduledDate && (
          <>
            <p className="text-sm text-[var(--ink-70)] mb-1">Scheduled for</p>
            <p className="text-sm font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--font-data)' }}>
              {scheduledDate}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-[var(--ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 001 1h1m0 0h2a1 1 0 001-1v-3.28a1 1 0 00-.684-.948l-1.923-.641a1 1 0 01-.578-.502l-1.539-3.076A1 1 0 0013.382 7H13" />
        </svg>
        <h3 className="text-sm font-semibold text-[var(--ink)]">Request pickup</h3>
      </div>
      <p className="text-xs text-[var(--ink-70)] mb-4">
        Ask {courier} to collect this parcel from the store.
      </p>

      <button
        type="button"
        onClick={handleRequest}
        disabled={loading}
        className="w-full py-2.5 bg-[var(--ink)] text-[var(--paper-card)] text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Requesting pickup...' : `Request ${courier} pickup`}
      </button>

      {error && <p className="mt-2 text-xs text-[var(--ink)]">{error}</p>}
    </div>
  );
}
