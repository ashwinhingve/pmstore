'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/store/useToastStore';

interface OrderActionsProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  trackingNumber?: string;
}

export default function OrderActions({
  orderId,
  orderStatus,
  paymentStatus,
  trackingNumber,
}: OrderActionsProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancelling(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelReason || 'Customer requested cancellation',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      toast.success('Order cancelled');
      router.refresh();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error.message || "Couldn't cancel this order. Try again.");
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  const canCancel = ['pending', 'confirmed', 'processing'].includes(orderStatus);

  return (
    <div className="space-y-3">
      {paymentStatus === 'pending' && (
        <button className="w-full bg-[var(--ink)] text-[var(--paper-card)] py-2 px-4 rounded-lg hover:opacity-90 font-medium">
          Retry Payment
        </button>
      )}

      {trackingNumber && (
        <a
          href="#tracking"
          className="block w-full bg-[var(--ink)] text-[var(--paper-card)] py-2 px-4 rounded-lg hover:opacity-90 font-medium text-center"
        >
          View Tracking
        </a>
      )}

      {canCancel && (
        <button
          onClick={() => setShowCancelModal(true)}
          disabled={cancelling}
          className="w-full bg-[var(--foil-soft)] text-[var(--ink)] py-2 px-4 rounded-lg hover:bg-[var(--foil)] font-medium disabled:opacity-50"
        >
          {cancelling ? 'Cancelling...' : 'Cancel Order'}
        </button>
      )}

      <Link
        href="/orders"
        className="block w-full bg-[var(--foil-soft)] text-[var(--ink)] py-2 px-4 rounded-lg hover:bg-[var(--foil)] font-medium text-center"
      >
        View all orders
      </Link>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--paper-card)] rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-[var(--ink)] mb-4">Cancel Order</h3>
            <p className="text-[var(--ink-70)] mb-4">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-[var(--ink)] mb-2">
                Reason (Optional)
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-[var(--foil-soft)] rounded-lg p-2 text-sm text-[var(--ink)]"
                rows={3}
                placeholder="Tell us why you're cancelling..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-[var(--foil-soft)] text-[var(--ink)] py-2 px-4 rounded-lg hover:bg-[var(--foil)] font-medium"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 bg-[var(--ink)] text-[var(--paper-card)] py-2 px-4 rounded-lg hover:opacity-90 font-medium disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
