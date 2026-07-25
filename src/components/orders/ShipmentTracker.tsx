'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/store/useToastStore';

interface Scan {
  status: string;
  location: string;
  timestamp: string;
  remarks?: string;
}

interface TrackingData {
  waybill: string;
  status: string;
  currentLocation?: string;
  estimatedDelivery?: string;
  deliveryDate?: string;
  scans: Scan[];
}

interface ShipmentTrackerProps {
  waybill: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export default function ShipmentTracker({
  waybill,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
}: ShipmentTrackerProps) {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/shipping/track?waybill=${waybill}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tracking data');
      }

      setTracking(data.tracking);
    } catch (err: any) {
      console.error('Error fetching tracking:', err);
      setError(err.message || 'Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();

    if (autoRefresh) {
      const interval = setInterval(fetchTracking, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [waybill, autoRefresh, refreshInterval]);

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();

    if (lowerStatus.includes('delivered')) return 'text-[var(--mint)] bg-[var(--mint-soft)]';
    if (lowerStatus.includes('out for delivery')) return 'text-[var(--ink)] bg-[var(--foil-soft)]';
    if (lowerStatus.includes('in transit') || lowerStatus.includes('dispatched'))
      return 'text-[var(--ink)] bg-[var(--foil-soft)]';
    if (lowerStatus.includes('pending')) return 'text-[var(--ink-70)] bg-[var(--foil-soft)]';
    if (lowerStatus.includes('cancelled') || lowerStatus.includes('rto'))
      return 'text-[var(--ink)] bg-[var(--foil-soft)]';

    return 'text-[var(--ink-70)] bg-[var(--foil-soft)]';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(waybill);
    toast.success('Tracking number copied');
  };

  if (loading && !tracking) {
    return (
      <div className="bg-[var(--paper-card)] rounded-lg shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-[var(--ink)] border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-3 text-[var(--ink-70)]">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--paper-card)] rounded-lg shadow-[var(--shadow-card)] p-6">
        <div className="bg-[var(--foil-soft)] border border-[var(--foil)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-[var(--ink)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <p className="text-sm text-[var(--ink-70)]">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return null;
  }

  return (
    <div className="bg-[var(--paper-card)] rounded-lg shadow-[var(--shadow-card)] p-6" id="tracking">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-[var(--ink)]">Shipment Tracking</h3>
        <button
          onClick={fetchTracking}
          disabled={loading}
          className="text-[var(--ink)] hover:opacity-70 flex items-center gap-2 text-sm"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Tracking Number */}
      <div className="bg-[var(--foil-soft)] rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-[var(--ink-70)] mb-1">Tracking Number</p>
            <p className="text-lg font-bold text-[var(--ink)] pack">{tracking.waybill}</p>
          </div>
          <button
            onClick={copyToClipboard}
            className="bg-[var(--paper-card)] border border-[var(--foil-soft)] px-4 py-2 rounded-lg hover:bg-[var(--foil-soft)] flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-[var(--ink-70)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm text-[var(--ink)]">Copy</span>
          </button>
        </div>
      </div>

      {/* Current Status */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(
              tracking.status
            )}`}
          >
            {tracking.status}
          </div>
          {tracking.currentLocation && (
            <div className="flex items-center gap-2 text-[var(--ink-70)]">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{tracking.currentLocation}</span>
            </div>
          )}
        </div>

        {tracking.estimatedDelivery && !tracking.deliveryDate && (
          <p className="text-sm text-[var(--ink-70)] mt-2">
            Estimated Delivery:{' '}
            <span className="font-medium pack">
              {new Date(tracking.estimatedDelivery).toLocaleDateString()}
            </span>
          </p>
        )}

        {tracking.deliveryDate && (
          <p className="text-sm text-[var(--mint)] mt-2 font-medium pack">
            Delivered on {new Date(tracking.deliveryDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Tracking Timeline */}
      <div>
        <h4 className="font-semibold text-[var(--ink)] mb-4">Tracking History</h4>
        <div className="space-y-4">
          {tracking.scans.map((scan, index) => (
            <div key={index} className="flex gap-4">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-[var(--ink)]' : 'bg-[var(--foil-soft)]'
                  }`}
                ></div>
                {index < tracking.scans.length - 1 && (
                  <div className="w-0.5 h-full bg-[var(--foil-soft)] mt-1"></div>
                )}
              </div>

              {/* Scan details */}
              <div className="flex-1 pb-4">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-[var(--ink)]">{scan.status}</p>
                  <p className="text-sm text-[var(--ink-40)] pack">
                    {new Date(scan.timestamp).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-[var(--ink-70)]">{scan.location}</p>
                {scan.remarks && (
                  <p className="text-xs text-[var(--ink-40)] mt-1">{scan.remarks}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
