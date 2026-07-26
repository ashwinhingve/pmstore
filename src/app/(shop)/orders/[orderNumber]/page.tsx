import { requireAuth } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Shipment from '@/models/Shipment';
import { notFound } from 'next/navigation';
import OrderTimeline from '@/components/orders/OrderTimeline';
import OrderItemsDisplay from '@/components/orders/OrderItemsDisplay';
import OrderSummaryCard from '@/components/orders/OrderSummaryCard';
import OrderActions from '@/components/orders/OrderActions';
import { ArrowLeft, Download, Mail, Package, Phone, Truck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CONTACT } from '@/lib/constants';

interface PageProps {
  params: Promise<{
    orderNumber: string;
  }>;
}

export default async function UserOrderDetailsPage({ params }: PageProps) {
  // Require authentication
  const session = await requireAuth();
  const userId = session.user.id;

  // Connect to database
  await connectDB();

  const { orderNumber } = await params;

  // Fetch order - ensure it belongs to the logged-in user
  const order = await Order.findOne({
    orderNumber,
    userId,
  })
    .populate('shippingAddressId')
    .populate({
      path: 'items',
      populate: { path: 'productId' },
    })
    .lean();

  if (!order) {
    notFound();
  }

  const o = order as any;

  // Fetch shipment if exists
  const shipment = o.trackingNumber
    ? await Shipment.findOne({ waybill: o.trackingNumber }).lean()
    : null;

  // Get populated shipping address
  const addr = o.shippingAddressId as any;

  // Transform data
  const orderData = {
    id: o._id.toString(),
    orderNumber: o.orderNumber,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount,
    subtotal: o.subtotal,
    shippingCost: o.shippingCost || 0,
    tax: o.taxAmount || 0,
    discount: o.discountAmount || 0,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt?.toISOString() || o.createdAt.toISOString(),

    // Shipping address (from populated shippingAddressId)
    shippingAddress: {
      name: addr?.fullName || addr?.name || '',
      phone: addr?.phoneNumber || addr?.phone || '',
      email: addr?.email || '',
      addressLine1: addr?.addressLine1 || '',
      addressLine2: addr?.addressLine2 || '',
      city: addr?.city || '',
      state: addr?.state || '',
      postalCode: addr?.postalCode || '',
      country: addr?.country || 'India',
    },

    // Items (from populated OrderItem refs)
    items: o.items?.map((item: any) => {
      const product = item.productId;
      const rawImage = item.productImage || item.image || product?.images?.[0] || '';
      const imageUrl = typeof rawImage === 'string' ? rawImage : rawImage?.url || '';
      return {
        productId: product?._id?.toString() || item.productId?.toString() || '',
        productName: item.productName || product?.name || '',
        sku: item.productSku || item.sku || product?.sku || '',
        quantity: item.quantity || 0,
        price: item.priceAtPurchase || item.price || 0,
        total: item.subtotal || (item.quantity || 0) * (item.priceAtPurchase || item.price || 0),
        image: imageUrl,
      };
    }) || [],

    // Shipping info
    waybill: o.trackingNumber || null,
    courier: (shipment as any)?.courierName || null,
    trackingUrl: o.trackingNumber
      ? ((shipment as any)?.trackingUrl ||
          (() => {
            const p = (shipment as any)?.provider || o.shippingProvider || 'delhivery';
            if (p === 'shiprocket') return `https://shiprocket.co/tracking/${o.trackingNumber}`;
            return `https://www.delhivery.com/track/package/${o.trackingNumber}`;
          })())
      : null,
    estimatedDelivery:
      o.estimatedDeliveryDate?.toISOString() ||
      (shipment as any)?.estimatedDelivery?.toISOString() ||
      null,
    shipmentStatus: (shipment as any)?.shipmentStatus || null,
    shipmentDate: (shipment as any)?.createdAt?.toISOString() || null,

    // Payment method
    paymentMethod: o.paymentMethod || 'N/A',

    // Refund / cancellation fields
    refundAmount: o.refundAmount || 0,
    refundedAt: o.refundedAt?.toISOString() || null,
    cancelledAt: o.cancelledAt?.toISOString() || null,
  };

  // Check if order is eligible for cancellation
  const canCancel = ['pending', 'confirmed', 'processing'].includes(orderData.orderStatus);

  // Check if order is eligible for return/refund
  const isDelivered = orderData.orderStatus === 'delivered';
  const deliveryDate = (shipment as any)?.deliveredAt || o.updatedAt;
  const daysSinceDelivery = deliveryDate
    ? Math.floor((Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const canReturn = isDelivered && daysSinceDelivery <= 7;

  return (
    <div className="min-h-screen bg-[var(--paper)] py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/orders"
              className="mb-4 inline-flex min-h-11 items-center gap-2 text-[var(--mint)] transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to orders
            </Link>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="data mb-2 text-[length:var(--step-2)] font-bold text-[var(--ink)]">
                  Order #{orderData.orderNumber}
                </h1>
                <p className="data text-[var(--ink-70)]">
                  Placed on{' '}
                  {new Date(orderData.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Kolkata',
                  })}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={`/api/orders/${orderData.orderNumber}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border-2 border-[var(--foil)] bg-[var(--paper-card)] px-4 py-2 font-medium text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download invoice
                </a>

                {orderData.trackingUrl && (
                  <a
                    href={orderData.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border-2 border-[var(--foil)] bg-[var(--paper-card)] px-4 py-2 font-medium text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)]"
                  >
                    <Truck className="h-4 w-4" aria-hidden="true" />
                    Track on {orderData.courier || 'courier'}
                  </a>
                )}

                {canReturn && (
                  <Link href={`/orders/${orderData.orderNumber}/return`}>
                    <Button className="bg-[var(--mint)] hover:bg-[var(--mint-deep)]">
                      Request return
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Cancellation / Refund Banner */}
          {orderData.orderStatus === 'cancelled' && (
            <div className="mb-6 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--foil)] bg-[var(--foil-soft)] p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-semibold text-[var(--ink-70)]">Order cancelled</p>
                {orderData.cancelledAt && (
                  <p className="text-sm text-[var(--ink-70)] mt-0.5">
                    Cancelled on{' '}
                    {new Date(orderData.cancelledAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              {orderData.refundAmount > 0 && (
                <div className="shrink-0 rounded-[var(--radius-md)] border border-[var(--foil)] bg-[var(--paper-card)] px-5 py-3 text-center">
                  <p className="mb-0.5 text-xs text-[var(--ink-70)]">Refund initiated</p>
                  <p className="data text-xl font-bold text-[var(--mint)]">
                    ₹{orderData.refundAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--ink-70)] mt-0.5">Processing (5–7 business days)</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left Column (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Timeline */}
              <OrderTimeline
                orderStatus={orderData.orderStatus}
                paymentStatus={orderData.paymentStatus}
                createdAt={orderData.createdAt}
                shipmentDate={orderData.shipmentDate}
                estimatedDelivery={orderData.estimatedDelivery}
              />

              {/* Order Items */}
              <OrderItemsDisplay items={orderData.items} />

              {/* Shipping Information */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-[var(--ink)]">
                  <Package className="h-5 w-5 text-[var(--mint)]" aria-hidden="true" />
                  Shipping information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[var(--ink-70)]">Name</p>
                      <p className="text-sm font-medium text-[var(--ink)]">
                        {orderData.shippingAddress.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--ink-70)]">Phone</p>
                      <p className="text-sm font-medium text-[var(--ink)]">
                        {orderData.shippingAddress.phone}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-[var(--ink-70)]">Delivery address</p>
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {orderData.shippingAddress.addressLine1}
                      {orderData.shippingAddress.addressLine2 && (
                        <>, {orderData.shippingAddress.addressLine2}</>
                      )}
                    </p>
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {orderData.shippingAddress.city}, {orderData.shippingAddress.state}{' '}
                      {orderData.shippingAddress.postalCode}
                    </p>
                  </div>

                  {orderData.waybill && (
                    <div className="border-t border-[var(--foil-soft)] pt-3 mt-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-[var(--ink-70)]">Tracking number</p>
                          <p className="data text-sm font-medium text-[var(--ink)]">
                            {orderData.waybill}
                          </p>
                        </div>
                        {orderData.courier && (
                          <div>
                            <p className="text-sm text-[var(--ink-70)]">Courier</p>
                            <p className="text-sm font-medium text-[var(--ink)]">
                              {orderData.courier}
                            </p>
                          </div>
                        )}
                      </div>

                      {orderData.estimatedDelivery && (
                        <div className="mt-3">
                          <p className="text-sm text-[var(--ink-70)]">Estimated delivery</p>
                          <p className="text-sm font-medium text-[var(--ink)]">
                            {new Date(orderData.estimatedDelivery).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
                <h3 className="mb-4 text-xl font-bold text-[var(--ink)]">
                  Payment information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[var(--ink-70)]">Payment method</p>
                      <p className="text-sm font-medium text-[var(--ink)] capitalize">
                        {orderData.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--ink-70)]">Payment status</p>
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-medium rounded-full capitalize ${
                          orderData.paymentStatus === 'paid' ||
                          orderData.paymentStatus === 'success'
                            ? 'bg-[var(--mint-soft)] text-[var(--mint)]'
                            : orderData.paymentStatus === 'refunded'
                            ? 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                            : orderData.paymentStatus === 'pending'
                            ? 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                            : 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                        }`}
                      >
                        {orderData.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Refund details */}
                  {orderData.refundAmount > 0 && (
                    <div className="border-t border-[var(--foil-soft)] pt-3 mt-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-[var(--ink-70)]">Refund amount</p>
                          <p className="data text-sm font-semibold text-[var(--mint)]">
                            ₹{orderData.refundAmount.toLocaleString()}
                          </p>
                        </div>
                        {orderData.refundedAt && (
                          <div>
                            <p className="text-sm text-[var(--ink-70)]">Refund initiated</p>
                            <p className="text-sm font-medium text-[var(--ink)]">
                              {new Date(orderData.refundedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--mint)] animate-pulse"></span>
                        <p className="text-xs text-[var(--ink-70)]">
                          Refund processing — typically 5–7 business days
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - Right Column (1/3) */}
            <div className="space-y-6">
              {/* Order Summary */}
              <OrderSummaryCard orderData={orderData} />

              {/* Cancel Order */}
              {canCancel && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
                  <h3 className="mb-3 text-lg font-bold text-[var(--ink)]">Order actions</h3>
                  <OrderActions
                    orderId={orderData.id}
                    orderStatus={orderData.orderStatus}
                    paymentStatus={orderData.paymentStatus}
                    trackingNumber={orderData.waybill || undefined}
                  />
                </div>
              )}

              {/* Need help? */}
              <div className="rounded-[var(--radius-lg)] bg-[image:var(--surface-hero)] p-6 shadow-[var(--shadow-md)]">
                <h3 className="mb-3 text-lg font-bold text-[var(--paper)]">Need help?</h3>
                <p className="mb-4 text-sm text-[var(--ink-10)]">
                  Have questions about your order? Our customer support team is here to help.
                </p>
                <div className="space-y-2">
                  <a
                    href={CONTACT.emailHref}
                    className="flex items-center gap-2 text-sm font-medium text-[var(--paper)] transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
                  >
                    <Mail className="h-4 w-4 text-[var(--mint-soft)]" aria-hidden="true" />
                    {CONTACT.email}
                  </a>
                  <a
                    href={CONTACT.phoneHref}
                    className="data flex items-center gap-2 text-sm font-medium text-[var(--paper)] transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
                  >
                    <Phone className="h-4 w-4 text-[var(--mint-soft)]" aria-hidden="true" />
                    {CONTACT.phone}
                  </a>
                </div>
              </div>

              {/* Return Policy Info */}
              {isDelivered && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
                  <h3 className="mb-3 text-lg font-bold text-[var(--ink)]">Return policy</h3>
                  <p className="text-sm text-[var(--ink)] mb-2">
                    {canReturn ? (
                      <>
                        You have <strong>{7 - daysSinceDelivery} days</strong> left to request a
                        return or exchange.
                      </>
                    ) : (
                      <>The 7-day return window for this order has expired.</>
                    )}
                  </p>
                  <p className="text-xs text-[var(--ink-70)]">
                    Items must be unused and in original packaging.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
