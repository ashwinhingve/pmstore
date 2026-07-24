"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCartStore, cartItemKey } from '@/store/useCartStore';
import { AddressStep } from '@/components/checkout/AddressStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import { PrescriptionUpload } from '@/components/prescriptions/PrescriptionUpload';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, getTotalPrice, discount, getDiscountAmount } = useCartStore();
  const [currentStep, setCurrentStep] = useState<'address' | 'payment'>('address');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const hasRxItems = items.some((item) => item.product.prescriptionRequired);
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    orderNumber: string;
    subtotal: number;
    shippingCost: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
  } | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[var(--ink)] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[var(--ink-70)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login?redirect=/checkout');
    return null;
  }

  // Redirect if cart is empty
  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  const handleAddressNext = async (addressId: string) => {
    // Server enforces this too; this is the fast, friendly guard.
    if (hasRxItems && !prescriptionId) {
      setOrderError('Attach a prescription for the prescription-only items before continuing.');
      return;
    }
    setSelectedAddressId(addressId);
    setCreatingOrder(true);
    setOrderError(null);

    try {
      // Cancel previous pending order if user went back and changed address
      if (orderDetails?.orderId) {
        await fetch(`/api/orders/${orderDetails.orderId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Customer changed shipping address' }),
        }).catch(() => {}); // non-blocking, best-effort
        setOrderDetails(null);
      }
      // Prepare cart items
      const cartItems = items.map((item) => ({
        productId: item.product.id,
        variantId: item.product.variantId || undefined,
        quantity: item.quantity,
        price: item.product.price,
      }));

      // Create order (backend calculates totals server-side)
      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartItems,
          shippingAddressId: addressId,
          discountId: discount?.id || undefined,
          prescriptionId: prescriptionId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Store order details (use backend-calculated values)
      setOrderDetails({
        orderId: data.order._id,
        orderNumber: data.order.orderNumber,
        subtotal: data.order.subtotal,
        shippingCost: data.order.shippingCost,
        taxAmount: data.order.taxAmount,
        discountAmount: data.order.discountAmount ?? 0,
        totalAmount: data.order.totalAmount,
      });

      // Move to payment step
      setCurrentStep('payment');
    } catch (error: any) {
      console.error('Error creating order:', error);
      setOrderError(error.message || 'Failed to create order. Please try again.');
    } finally {
      setCreatingOrder(false);
    }
  };

  const cartSubtotal = getTotalPrice();
  const cartDiscount = getDiscountAmount();
  const estimatedShipping = cartSubtotal >= 500 ? 0 : 30;
  // Prices are GST-inclusive — no separate tax added to total
  const estimatedTotal = Math.max(0, cartSubtotal + estimatedShipping - cartDiscount);

  // Use backend values once order is created, otherwise show estimates
  const subtotal = orderDetails?.subtotal ?? cartSubtotal;
  const shipping = orderDetails?.shippingCost ?? estimatedShipping;
  const discountAmt = orderDetails?.discountAmount ?? cartDiscount;
  const total = orderDetails?.totalAmount ?? estimatedTotal;

  return (
    <div className="min-h-screen bg-[var(--paper)] py-12">
      <div className="container mx-auto px-4">
        <AnimatedSection direction="up">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 text-[var(--ink)]">
              Checkout
            </h1>
            <p className="text-[var(--ink-70)]">Complete your order</p>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep === 'address'
                        ? 'bg-[var(--ink)] text-[var(--paper-card)]'
                        : 'bg-[var(--mint)] text-[var(--paper-card)]'
                    }`}>
                      {currentStep === 'payment' ? '✓' : '1'}
                    </div>
                    <span className="ml-2 font-medium text-[var(--ink)]">Address</span>
                  </div>
                  <div className="w-16 h-1 bg-[var(--foil-soft)]"></div>
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep === 'payment'
                        ? 'bg-[var(--ink)] text-[var(--paper-card)]'
                        : 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                    }`}>
                      2
                    </div>
                    <span className="ml-2 font-medium text-[var(--ink)]">Payment</span>
                  </div>
                </div>
              </div>

              {/* Step Content */}
              <div className="bg-[var(--paper-card)] rounded-2xl shadow-card p-6 md:p-8">
                {currentStep === 'address' && (
                  <>
                    {orderError && (
                      <div className="mb-6 bg-[var(--foil-soft)] border border-[var(--foil)] rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-[var(--ink)]"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                          <p className="text-sm text-[var(--ink)]">{orderError}</p>
                        </div>
                      </div>
                    )}
                    {hasRxItems && (
                      <div className="mb-6 border-b border-[var(--foil-soft)] pb-6">
                        <h2 className="mb-1 text-lg font-semibold text-[var(--ink)]">
                          Prescription
                        </h2>
                        <p className="mb-4 text-sm text-[var(--ink-70)]">
                          Your cart includes prescription-only medicines. Attach a clear photo of the
                          prescription — our pharmacist verifies it before dispatch.
                        </p>
                        <PrescriptionUpload onUploaded={setPrescriptionId} />
                      </div>
                    )}
                    <AddressStep onNext={handleAddressNext} disabled={creatingOrder} />
                    {creatingOrder && (
                      <div className="mt-4 text-center">
                        <div className="inline-block w-6 h-6 border-4 border-[var(--ink)] border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-2 text-sm text-[var(--ink-70)]">Creating order...</p>
                      </div>
                    )}
                  </>
                )}

                {currentStep === 'payment' && orderDetails && (
                  <>
                    <button
                      onClick={() => setCurrentStep('address')}
                      className="mb-4 text-[var(--ink)] hover:text-[var(--ink-70)] flex items-center gap-2"
                    >
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
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back to Address
                    </button>
                    <PaymentStep
                      orderId={orderDetails.orderId}
                      orderNumber={orderDetails.orderNumber}
                      totalAmount={orderDetails.totalAmount}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-[var(--paper-card)] rounded-2xl shadow-card p-6 sticky top-24">
                <h3 className="text-xl font-bold text-[var(--ink)] mb-4">Order Summary</h3>

                {/* Cart Items */}
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={cartItemKey(item.product.id, item.product.variantId)} className="flex gap-3 pb-3 border-b border-[var(--foil-soft)]">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-[var(--ink)]">{item.product.name}</p>
                        <p className="text-xs text-[var(--ink-40)]">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-[var(--ink)]">
                        ₹{(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-[var(--ink-70)]">
                    <span>Subtotal ({items.length} items)</span>
                    <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[var(--ink-70)]">
                    <span>Shipping</span>
                    <span className="font-medium">
                      {shipping === 0 ? (
                        <span className="text-[var(--mint)]">FREE</span>
                      ) : (
                        `₹${shipping}`
                      )}
                    </span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-[var(--mint)]">
                      <span className="font-medium">
                        Discount{discount ? ` (${discount.name})` : ''}
                      </span>
                      <span className="font-semibold">-₹{discountAmt.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-[var(--foil-soft)] pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-[var(--ink)]">Total</span>
                      <span className="text-2xl font-bold text-[var(--ink)]">
                        ₹{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Free Shipping Banner */}
                {shipping > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-center">
                    <p className="text-amber-800">
                      Add ₹{(500 - subtotal).toLocaleString()} more for FREE shipping!
                    </p>
                  </div>
                )}

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-around text-xs text-gray-600">
                    <div className="text-center">
                      <div className="text-2xl mb-1">🔒</div>
                      <span>Secure Payment</span>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-1">📦</div>
                      <span>Fast Delivery</span>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-1">✓</div>
                      <span>100% Authentic</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
