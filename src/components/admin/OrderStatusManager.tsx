'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface OrderStatusManagerProps {
  orderId: string;
  currentStatus: string;
  paymentStatus: string;
  refundAmount?: number;
  refundedAt?: string | null;
  cancelledAt?: string | null;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  { value: 'processing', label: 'Processing', color: 'bg-purple-100 text-purple-700' },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
];

export default function OrderStatusManager({
  orderId,
  currentStatus,
  paymentStatus,
  refundAmount = 0,
  refundedAt = null,
  cancelledAt = null,
}: OrderStatusManagerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [livePaymentStatus, setLivePaymentStatus] = useState(paymentStatus);
  const [liveRefundAmount, setLiveRefundAmount] = useState(refundAmount);
  const [liveRefundedAt, setLiveRefundedAt] = useState(refundedAt);
  const [liveCancelledAt, setLiveCancelledAt] = useState(cancelledAt);

  const handleStatusUpdate = async () => {
    if (status === currentStatus) {
      return;
    }

    setIsUpdating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      // Immediately reflect refund/cancellation data in UI
      if (data.order) {
        setLivePaymentStatus(data.order.paymentStatus);
        setLiveRefundAmount(data.order.refundAmount || 0);
        setLiveRefundedAt(data.order.refundedAt || null);
        setLiveCancelledAt(data.order.cancelledAt || null);
      }

      setSuccess('Order status updated successfully');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStatusOption = statusOptions.find((opt) => opt.value === currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h3>

      {/* Current Status Display */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Current Status</p>
        <span
          className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-full ${
            currentStatusOption?.color || 'bg-gray-100 text-gray-700'
          }`}
        >
          {currentStatusOption?.label || currentStatus}
        </span>
      </div>

      {/* Refund info when order is cancelled with refund */}
      {isCancelled && liveRefundAmount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-semibold text-blue-700 mb-1">Refund Initiated</p>
          <p className="text-sm font-bold text-blue-800">₹{liveRefundAmount.toLocaleString()}</p>
          {liveRefundedAt && (
            <p className="text-xs text-blue-600 mt-1">
              {new Date(liveRefundedAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

      {/* Cancelled date */}
      {isCancelled && liveCancelledAt && (
        <div className="mb-4">
          <p className="text-xs text-gray-500">
            Cancelled on{' '}
            {new Date(liveCancelledAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
      )}

      {/* Status Selector — hidden once cancelled */}
      {!isCancelled && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isUpdating}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {livePaymentStatus === 'pending' && !['pending', 'cancelled'].includes(status) && (
              <p className="text-xs text-amber-600 mt-1">
                Note: forward-progression statuses require payment to be completed.
              </p>
            )}
          </div>

          {/* Update Button */}
          <Button
            onClick={handleStatusUpdate}
            disabled={isUpdating || status === currentStatus}
            className="w-full bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800 text-white disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
