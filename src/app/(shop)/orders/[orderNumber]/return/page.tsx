'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  image: string;
}

export default function ReturnRequestPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);

  const [returnType, setReturnType] = useState<'refund' | 'exchange'>('refund');
  const [reason, setReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    { productId: string; quantity: number; returnReason?: string }[]
  >([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/orders/' + orderNumber + '/return');
    } else if (status === 'authenticated') {
      fetchOrderDetails();
    }
  }, [status]);

  async function fetchOrderDetails() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderNumber}`);
      if (response.ok) {
        const data = await response.json();
        setOrderItems(data.items || []);
        setOrderTotal(data.totalAmount || 0);

        // Pre-select all items
        setSelectedItems(
          data.items?.map((item: OrderItem) => ({
            productId: item.productId,
            quantity: item.quantity,
          })) || []
        );
      } else {
        setError('Failed to load order details');
      }
    } catch (err) {
      setError('An error occurred while loading order details');
    } finally {
      setIsLoading(false);
    }
  }

  const handleItemToggle = (productId: string, quantity: number) => {
    const exists = selectedItems.find((item) => item.productId === productId);
    if (exists) {
      setSelectedItems(selectedItems.filter((item) => item.productId !== productId));
    } else {
      setSelectedItems([...selectedItems, { productId, quantity }]);
    }
  };

  const calculateRefundAmount = () => {
    return selectedItems.reduce((total, selectedItem) => {
      const item = orderItems.find((oi) => oi.productId === selectedItem.productId);
      if (item) {
        return total + item.price * selectedItem.quantity;
      }
      return total;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    if (!reason) {
      setError('Please select a return reason');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/orders/${orderNumber}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnType,
          reason,
          reasonDetails,
          items: selectedItems.map((si) => {
            const item = orderItems.find((oi) => oi.productId === si.productId);
            return {
              productId: si.productId,
              productName: item?.productName || '',
              sku: item?.sku || '',
              quantity: si.quantity,
              price: item?.price || 0,
            };
          }),
          refundAmount: calculateRefundAmount(),
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/orders/${orderNumber}`);
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit return request');
      }
    } catch (err) {
      setError('An error occurred while submitting your request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[var(--ink)] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[var(--ink-70)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
        <div className="bg-[var(--paper-card)] rounded-2xl shadow-[var(--shadow-card)] p-12 max-w-md text-center">
          <div className="w-16 h-16 bg-[var(--mint-soft)] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-[var(--mint)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-2">
            Return Request Submitted!
          </h2>
          <p className="text-[var(--ink-70)] mb-6">
            Your return request has been submitted successfully. Our team will review it
            shortly.
          </p>
          <p className="text-sm text-[var(--ink-40)]">Redirecting to order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/orders/${orderNumber}`}
              className="inline-flex items-center gap-2 text-[var(--ink)] hover:opacity-70 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Order
            </Link>

            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[var(--ink)]">
              Request Return/Refund
            </h1>
            <p className="text-[var(--ink-70)]">Order <span className="pack">#{orderNumber}</span></p>
          </div>

          {error && (
            <div className="bg-[var(--foil-soft)] border-2 border-[var(--foil)] rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--ink)] flex-shrink-0 mt-0.5" />
              <p className="text-[var(--ink-70)]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Return Type */}
            <div className="bg-[var(--paper-card)] rounded-2xl shadow-[var(--shadow-card)] p-6">
              <h3 className="text-lg font-bold text-[var(--ink)] mb-4">Return Type</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setReturnType('refund')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    returnType === 'refund'
                      ? 'border-[var(--ink)] bg-[var(--foil-soft)]'
                      : 'border-[var(--foil-soft)] hover:border-[var(--foil)]'
                  }`}
                >
                  <p className="font-semibold text-[var(--ink)]">Refund</p>
                  <p className="text-sm text-[var(--ink-70)]">Get your money back</p>
                </button>
                <button
                  type="button"
                  onClick={() => setReturnType('exchange')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    returnType === 'exchange'
                      ? 'border-[var(--ink)] bg-[var(--foil-soft)]'
                      : 'border-[var(--foil-soft)] hover:border-[var(--foil)]'
                  }`}
                >
                  <p className="font-semibold text-[var(--ink)]">Exchange</p>
                  <p className="text-sm text-[var(--ink-70)]">Replace with same product</p>
                </button>
              </div>
            </div>

            {/* Select Items */}
            <div className="bg-[var(--paper-card)] rounded-2xl shadow-[var(--shadow-card)] p-6">
              <h3 className="text-lg font-bold text-[var(--ink)] mb-4">Select Items</h3>
              <div className="space-y-3">
                {orderItems.map((item) => {
                  const isSelected = selectedItems.some(
                    (si) => si.productId === item.productId
                  );

                  return (
                    <label
                      key={item.productId}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--ink)] bg-[var(--foil-soft)]'
                          : 'border-[var(--foil-soft)] hover:border-[var(--foil)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleItemToggle(item.productId, item.quantity)}
                        className="w-5 h-5 text-[var(--ink)] rounded focus:ring-[var(--ink)]"
                      />
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--ink)]">{item.productName}</p>
                        <p className="text-sm text-[var(--ink-70)]">
                          Qty: {item.quantity} × <span className="price">₹{item.price.toLocaleString('en-IN')}</span>
                        </p>
                      </div>
                      <p className="font-bold text-[var(--ink)] price">
                        ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                      </p>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Return Reason */}
            <div className="bg-[var(--paper-card)] rounded-2xl shadow-[var(--shadow-card)] p-6">
              <h3 className="text-lg font-bold text-[var(--ink)] mb-4">Return Reason</h3>
              <div className="space-y-4">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-[var(--foil-soft)] focus:border-[var(--ink)] focus:outline-none text-[var(--ink)]"
                >
                  <option value="">Select a reason</option>
                  <option value="defective">Defective or damaged product</option>
                  <option value="wrong">Wrong item received</option>
                  <option value="size">Size/fit issue</option>
                  <option value="quality">Quality not as expected</option>
                  <option value="description">Not as described</option>
                  <option value="other">Other</option>
                </select>

                <textarea
                  value={reasonDetails}
                  onChange={(e) => setReasonDetails(e.target.value)}
                  placeholder="Please provide additional details (optional)"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[var(--foil-soft)] focus:border-[var(--ink)] focus:outline-none resize-none text-[var(--ink)]"
                />
              </div>
            </div>

            {/* Refund Summary */}
            {selectedItems.length > 0 && (
              <div className="bg-[var(--foil-soft)] rounded-2xl border-2 border-[var(--foil)] shadow-[var(--shadow-card)] p-6">
                <h3 className="text-lg font-bold text-[var(--ink)] mb-3">
                  {returnType === 'refund' ? 'Refund' : 'Exchange'} Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--ink-70)]">Items Selected:</span>
                    <span className="font-semibold text-[var(--ink)]">
                      {selectedItems.length}
                    </span>
                  </div>
                  {returnType === 'refund' && (
                    <div className="flex justify-between text-lg font-bold border-t border-[var(--foil)] pt-2">
                      <span className="text-[var(--ink)]">Refund Amount:</span>
                      <span className="text-[var(--ink)] price">
                        ₹{calculateRefundAmount().toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || selectedItems.length === 0}
                className="flex-1 bg-[var(--ink)] hover:opacity-90 text-[var(--paper-card)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  `Submit ${returnType === 'refund' ? 'Refund' : 'Exchange'} Request`
                )}
              </Button>
            </div>
          </form>

          {/* Policy Info */}
          <div className="mt-6 bg-[var(--foil-soft)] border-2 border-[var(--foil)] rounded-xl p-6">
            <h4 className="font-semibold text-[var(--ink)] mb-2">Return Policy</h4>
            <ul className="space-y-1 text-sm text-[var(--ink-70)]">
              <li>• Returns are accepted within 7 days of delivery</li>
              <li>• Items must be unused and in original packaging</li>
              <li>• Refunds will be processed within 5-7 business days</li>
              <li>• Pickup will be scheduled after approval</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
