'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCartStore } from '@/store/useCartStore';

interface PaymentStepProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
}

declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function PaymentStep({
  orderId,
  orderNumber,
  totalAmount,
}: PaymentStepProps) {
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const handleOnlinePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      const { paymentSessionId, environment } = data.data;

      if (window.Cashfree) {
        const cashfree = window.Cashfree({
          mode: environment === 'production' ? 'production' : 'sandbox',
        });
        await cashfree.checkout({ paymentSessionId, redirectTarget: '_self' });
      } else {
        throw new Error('Payment gateway failed to load. Please refresh and try again.');
      }
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      setError(err.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const handleCOD = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payment/confirm-cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm order');
      }

      clearCart();
      router.push(`/orders/${data.orderNumber}`);
    } catch (err: any) {
      console.error('COD confirmation error:', err);
      setError(err.message || 'Failed to confirm order');
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--paper-card)] p-6 rounded-lg shadow-[var(--shadow-sm)]">
      {/* Load Cashfree JS SDK */}
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => setSdkLoaded(true)}
        onError={() => setError('Failed to load payment gateway. Please refresh the page.')}
      />

      <h2 className="text-2xl font-bold text-[var(--ink)] mb-6">Payment</h2>

      {/* Order Summary */}
      <div className="bg-[var(--foil-soft)] p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[var(--ink-70)]">Order Number:</span>
          <span className="font-semibold text-[var(--ink)]">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--ink-70)]">Total Amount:</span>
          <span className="price text-2xl font-bold text-[var(--ink)]">
            ₹{totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--ink)] mb-3">Select Payment Method</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Online Payment */}
          <button
            onClick={() => setPaymentMethod('online')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              paymentMethod === 'online'
                ? 'border-[var(--ink)] bg-[var(--foil-soft)]'
                : 'border-[var(--foil-soft)] hover:border-[var(--foil)] bg-[var(--paper-card)]'
            }`}
          >
            <svg className="w-8 h-8 text-[var(--ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-sm font-semibold text-[var(--ink)]">Online Payment</span>
            <span className="text-xs text-[var(--ink-40)] text-center">Card, UPI, Net Banking</span>
          </button>

          {/* Cash on Delivery */}
          <button
            onClick={() => setPaymentMethod('cod')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              paymentMethod === 'cod'
                ? 'border-[var(--mint)] bg-[var(--mint-soft)]'
                : 'border-[var(--foil-soft)] hover:border-[var(--foil)] bg-[var(--paper-card)]'
            }`}
          >
            <svg className="w-8 h-8 text-[var(--mint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm font-semibold text-[var(--ink)]">Cash on Delivery</span>
            <span className="text-xs text-[var(--ink-40)] text-center">Pay when delivered</span>
          </button>
        </div>
      </div>

      {/* Online Payment Details */}
      {paymentMethod === 'online' && (
        <div className="mb-6">
          <p className="text-xs text-[var(--ink-40)] mb-3">Accepted methods:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z', label: 'Credit/Debit Card', color: 'text-[var(--ink)]' },
              { icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z', label: 'UPI', color: 'text-[var(--mint)]' },
              { icon: 'M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-1h16v1zm0-3H4V8h16v7z', label: 'Net Banking', color: 'text-[var(--ink)]' },
              { icon: 'M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z', label: 'Wallets', color: 'text-[var(--ink)]' },
            ].map(({ icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 bg-[var(--paper-card)] border border-[var(--foil-soft)] p-2.5 rounded-lg">
                <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d={icon} />
                </svg>
                <span className="text-xs font-medium text-[var(--ink)]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COD Info */}
      {paymentMethod === 'cod' && (
        <div className="bg-[var(--mint-soft)] border border-[var(--mint)] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[var(--mint)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[var(--mint)] mb-1">Cash on Delivery</p>
              <p className="text-xs text-[var(--ink-70)]">
                Pay <span className="price">₹{totalAmount.toFixed(2)}</span> in cash when your order is delivered. Please keep exact change ready.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Info (online only) */}
      {paymentMethod === 'online' && (
        <div className="bg-[var(--foil-soft)] border border-[var(--foil)] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[var(--ink)] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-1">Secure Payment Gateway</p>
              <p className="text-xs text-[var(--ink-70)]">
                Your payment information is encrypted and secure. We use Cashfree&apos;s industry-standard security protocols.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-[var(--foil-soft)] border border-[var(--foil)] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[var(--ink)] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-1">Error</p>
              <p className="text-xs text-[var(--ink-70)]">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {paymentMethod === 'online' ? (
        <button
          onClick={handleOnlinePayment}
          disabled={loading || !sdkLoaded}
          className="w-full bg-[var(--ink)] hover:opacity-90 text-[var(--paper-card)] font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-[var(--paper-card)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Proceed to Payment</span>
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleCOD}
          disabled={loading}
          className="w-full bg-[var(--mint)] hover:opacity-90 text-[var(--paper-card)] font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-[var(--paper-card)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Confirming...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 13l4 4L19 7" />
              </svg>
              <span>Confirm Order (Pay on Delivery)</span>
            </>
          )}
        </button>
      )}

      <p className="text-xs text-[var(--ink-40)] text-center mt-4">
        By proceeding, you agree to our Terms &amp; Conditions and Privacy Policy
      </p>
    </div>
  );
}
