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
  { value: 'pending', label: 'Pending', color: 'bg-[var(--foil-soft)] text-[var(--ink-70)]' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-[var(--foil-soft)] text-[var(--ink)]' },
  { value: 'processing', label: 'Processing', color: 'bg-[var(--foil-soft)] text-[var(--ink-70)]' },
  { value: 'shipped', label: 'Shipped', color: 'bg-[var(--foil-soft)] text-[var(--ink)]' },
  { value: 'delivered', label: 'Delivered', color: 'bg-[var(--mint-soft)] text-[var(--mint)]' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-[var(--foil-soft)] text-[var(--ink)]' },
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
    <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
      <h3 className="text-lg font-semibold text-[var(--ink)] mb-4">Order status</h3>

      {/* Current Status Display */}
      <div className="mb-4">
        <p className="text-sm text-[var(--ink-70)] mb-2">Current status</p>
        <span
          className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-full ${
            currentStatusOption?.color || 'bg-[var(--foil-soft)] text-[var(--ink)]'
          }`}
        >
          {currentStatusOption?.label || currentStatus}
        </span>
      </div>

      {/* Refund info when order is cancelled with refund */}
      {isCancelled && liveRefundAmount > 0 && (
        <div className="mb-4 p-3 bg-[var(--foil-soft)] border border-[var(--foil)] rounded-lg">
          <p className="text-xs font-semibold text-[var(--ink)] mb-1">Refund initiated</p>
          <p className="text-sm font-bold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>₹{liveRefundAmount.toLocaleString()}</p>
          {liveRefundedAt && (
            <p className="text-xs text-[var(--ink-70)] mt-1">
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
          <p className="text-xs text-[var(--ink-70)]">
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
            <label className="block text-sm font-medium text-[var(--ink)] mb-2">
              Update status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isUpdating}
              className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {livePaymentStatus === 'pending' && !['pending', 'cancelled'].includes(status) && (
              <p className="text-xs text-[var(--ink-70)] mt-1">
                Note: forward-progression statuses require payment to be completed.
              </p>
            )}
          </div>

          {/* Update Button */}
          <Button
            onClick={handleStatusUpdate}
            disabled={isUpdating || status === currentStatus}
            className="w-full bg-[var(--ink)] hover:opacity-90 text-[var(--paper-card)] disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update status'
            )}
          </Button>
        </>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="mt-4 p-3 bg-[var(--mint-soft)] border border-[var(--mint)] rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-[var(--mint)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--mint)]">{success}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-[var(--foil-soft)] border border-[var(--foil)] rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-[var(--ink)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--ink)]">{error}</p>
        </div>
      )}
    </div>
  );
}
