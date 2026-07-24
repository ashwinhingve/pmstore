"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCartStore, cartItemKey } from '@/store/useCartStore';
import { AddressStep } from '@/components/checkout/AddressStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import { PrescriptionUpload } from '@/components/prescriptions/PrescriptionUpload';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { Lock, Truck, BadgeCheck } from 'lucide-react';

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
      <div className="min-h-screen bg-[var(--paper)] py-12">
        <div className="mx-auto max-w-6xl px-4" aria-hidden="true">
          <div className="animate-shimmer mx-auto mb-8 h-10 w-56 rounded-[var(--radius-sm)]" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="animate-shimmer h-96 rounded-[var(--radius-lg)] lg:col-span-2" />
            <div className="animate-shimmer h-80 rounded-[var(--radius-lg)]" />
          </div>
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
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-[length:var(--step-2)] text-[var(--ink)]">Checkout</h1>
            <p className="text-[var(--ink-70)]">Complete your order</p>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Progress Steps */}
              <ol className="mb-8 flex items-center justify-center gap-4" aria-label="Checkout steps">
                <li className="flex items-center" aria-current={currentStep === 'address' ? 'step' : undefined}>
                  <span
                    className={`data flex h-10 w-10 items-center justify-center rounded-full font-semibold shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-base)] ${
                      currentStep === 'address'
                        ? 'bg-[var(--ink)] text-[var(--paper-card)]'
                        : 'bg-[var(--mint)] text-[var(--paper-card)]'
                    }`}
                  >
                    {currentStep === 'payment' ? '✓' : '1'}
                  </span>
                  <span className="ml-2 font-medium text-[var(--ink)]">Address</span>
                </li>
                <li aria-hidden="true">
                  <span
                    className={`block h-1 w-16 rounded-full transition-colors duration-[var(--dur-base)] ${
                      currentStep === 'payment' ? 'bg-[var(--mint)]' : 'bg-[var(--foil-soft)]'
                    }`}
                  />
                </li>
                <li className="flex items-center" aria-current={currentStep === 'payment' ? 'step' : undefined}>
                  <span
                    className={`data flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-colors duration-[var(--dur-base)] ${
                      currentStep === 'payment'
                        ? 'bg-[var(--ink)] text-[var(--paper-card)] shadow-[var(--shadow-xs)]'
                        : 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                    }`}
                  >
                    2
                  </span>
                  <span
                    className={`ml-2 font-medium ${
                      currentStep === 'payment' ? 'text-[var(--ink)]' : 'text-[var(--ink-70)]'
                    }`}
                  >
                    Payment
                  </span>
                </li>
              </ol>

              {/* Step Content */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)] md:p-8">
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
                      className="mb-4 flex min-h-11 items-center gap-2 text-[var(--ink)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--ink-70)]"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back to address
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
              <div className="sticky top-24 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-md)]">
                <h3 className="mb-4 text-[length:var(--step-1)] text-[var(--ink)]">Order summary</h3>

                {/* Cart Items */}
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={cartItemKey(item.product.id, item.product.variantId)} className="flex gap-3 pb-3 border-b border-[var(--foil-soft)]">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--ink)]">{item.product.name}</p>
                        <p className="data text-xs text-[var(--ink-40)]">Qty: {item.quantity}</p>
                      </div>
                      <p className="data font-semibold text-[var(--ink)]">
                        ₹{(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-[var(--ink-70)]">
                    <span>Subtotal ({items.length} items)</span>
                    <span className="data font-medium">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[var(--ink-70)]">
                    <span>Shipping</span>
                    <span className="data font-medium">
                      {shipping === 0 ? (
                        <span className="font-sans text-[var(--mint)]">Free</span>
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
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-[var(--ink)]">Total</span>
                      <span className="data text-2xl font-bold text-[var(--ink)]">
                        ₹{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Free Shipping Banner */}
                {shipping > 0 && (
                  <div className="rounded-[var(--radius-sm)] border border-[var(--foil)] bg-[var(--foil-soft)] p-3 text-center text-sm">
                    <p className="text-[var(--ink-70)]">
                      Add <span className="data">₹{(500 - subtotal).toLocaleString()}</span> more for free shipping
                    </p>
                  </div>
                )}

                {/* Trust Badges */}
                <div className="mt-6 border-t border-[var(--foil-soft)] pt-6">
                  <div className="flex items-center justify-around text-xs text-[var(--ink-70)]">
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <Lock className="h-5 w-5 text-[var(--mint)]" aria-hidden="true" />
                      <span>Secure payment</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <Truck className="h-5 w-5 text-[var(--mint)]" aria-hidden="true" />
                      <span>Fast delivery</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <BadgeCheck className="h-5 w-5 text-[var(--mint)]" aria-hidden="true" />
                      <span>100% authentic</span>
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
