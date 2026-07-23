'use client';

import { useState, useEffect } from 'react';

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

    if (lowerStatus.includes('delivered')) return 'text-green-600 bg-green-100';
    if (lowerStatus.includes('out for delivery')) return 'text-blue-600 bg-blue-100';
    if (lowerStatus.includes('in transit') || lowerStatus.includes('dispatched'))
      return 'text-purple-600 bg-purple-100';
    if (lowerStatus.includes('pending')) return 'text-yellow-600 bg-yellow-100';
    if (lowerStatus.includes('cancelled') || lowerStatus.includes('rto'))
      return 'text-red-600 bg-red-100';

    return 'text-gray-600 bg-gray-100';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(waybill);
    alert('Tracking number copied to clipboard!');
  };

  if (loading && !tracking) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-3 text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6" id="tracking">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Shipment Tracking</h3>
        <button
          onClick={fetchTracking}
          disabled={loading}
          className="text-orange-600 hover:text-orange-700 flex items-center gap-2 text-sm"
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
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 mb-1">Tracking Number</p>
            <p className="text-lg font-bold text-gray-900">{tracking.waybill}</p>
          </div>
          <button
            onClick={copyToClipboard}
            className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-gray-600"
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
            <span className="text-sm">Copy</span>
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
            <div className="flex items-center gap-2 text-gray-600">
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
          <p className="text-sm text-gray-600 mt-2">
            Estimated Delivery:{' '}
            <span className="font-medium">
              {new Date(tracking.estimatedDelivery).toLocaleDateString()}
            </span>
          </p>
        )}

        {tracking.deliveryDate && (
          <p className="text-sm text-green-600 mt-2 font-medium">
            Delivered on {new Date(tracking.deliveryDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Tracking Timeline */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Tracking History</h4>
        <div className="space-y-4">
          {tracking.scans.map((scan, index) => (
            <div key={index} className="flex gap-4">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                ></div>
                {index < tracking.scans.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                )}
              </div>

              {/* Scan details */}
              <div className="flex-1 pb-4">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-gray-900">{scan.status}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(scan.timestamp).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-gray-600">{scan.location}</p>
                {scan.remarks && (
                  <p className="text-xs text-gray-500 mt-1">{scan.remarks}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
