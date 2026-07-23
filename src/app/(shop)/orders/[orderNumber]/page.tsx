import { requireAuth } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Shipment from '@/models/Shipment';
import { notFound } from 'next/navigation';
import OrderTimeline from '@/components/orders/OrderTimeline';
import OrderItemsDisplay from '@/components/orders/OrderItemsDisplay';
import OrderSummaryCard from '@/components/orders/OrderSummaryCard';
import OrderActions from '@/components/orders/OrderActions';
import { ArrowLeft, Download, Package, Truck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Orders
            </Link>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
                    Order #{orderData.orderNumber}
                  </span>
                </h1>
                <p className="text-gray-600">
                  Placed on{' '}
                  {new Date(orderData.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={`/api/orders/${orderData.orderNumber}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Download Invoice
                </a>

                {orderData.trackingUrl && (
                  <a
                    href={orderData.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                  >
                    <Truck className="w-4 h-4" />
                    Track on {orderData.courier || 'Courier'}
                  </a>
                )}

                {canReturn && (
                  <Link href={`/orders/${orderData.orderNumber}/return`}>
                    <Button className="bg-gradient-to-r from-amber-600 to-red-700">
                      Request Return
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Cancellation / Refund Banner */}
          {orderData.orderStatus === 'cancelled' && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-red-700">Order Cancelled</p>
                {orderData.cancelledAt && (
                  <p className="text-sm text-red-600 mt-0.5">
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
                <div className="bg-white rounded-xl border border-blue-200 px-5 py-3 text-center shrink-0">
                  <p className="text-xs text-gray-500 mb-0.5">Refund Initiated</p>
                  <p className="text-xl font-bold text-blue-700">
                    ₹{orderData.refundAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">Processing (5–7 business days)</p>
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
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-600" />
                  Shipping Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {orderData.shippingAddress.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="text-sm font-medium text-gray-900">
                        {orderData.shippingAddress.phone}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Delivery Address</p>
                    <p className="text-sm font-medium text-gray-900">
                      {orderData.shippingAddress.addressLine1}
                      {orderData.shippingAddress.addressLine2 && (
                        <>, {orderData.shippingAddress.addressLine2}</>
                      )}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {orderData.shippingAddress.city}, {orderData.shippingAddress.state}{' '}
                      {orderData.shippingAddress.postalCode}
                    </p>
                  </div>

                  {orderData.waybill && (
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Tracking Number</p>
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {orderData.waybill}
                          </p>
                        </div>
                        {orderData.courier && (
                          <div>
                            <p className="text-sm text-gray-600">Courier</p>
                            <p className="text-sm font-medium text-gray-900">
                              {orderData.courier}
                            </p>
                          </div>
                        )}
                      </div>

                      {orderData.estimatedDelivery && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">Estimated Delivery</p>
                          <p className="text-sm font-medium text-gray-900">
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
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Payment Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {orderData.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Status</p>
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-medium rounded-full capitalize ${
                          orderData.paymentStatus === 'paid' ||
                          orderData.paymentStatus === 'success'
                            ? 'bg-green-100 text-green-700'
                            : orderData.paymentStatus === 'refunded'
                            ? 'bg-blue-100 text-blue-700'
                            : orderData.paymentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {orderData.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Refund details */}
                  {orderData.refundAmount > 0 && (
                    <div className="border-t border-gray-200 pt-3 mt-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Refund Amount</p>
                          <p className="text-sm font-semibold text-blue-700">
                            ₹{orderData.refundAmount.toLocaleString()}
                          </p>
                        </div>
                        {orderData.refundedAt && (
                          <div>
                            <p className="text-sm text-gray-600">Refund Initiated</p>
                            <p className="text-sm font-medium text-gray-900">
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
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <p className="text-xs text-blue-600">
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
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Order Actions</h3>
                  <OrderActions
                    orderId={orderData.id}
                    orderStatus={orderData.orderStatus}
                    paymentStatus={orderData.paymentStatus}
                    trackingNumber={orderData.waybill || undefined}
                  />
                </div>
              )}

              {/* Need Help? */}
              <div className="bg-gradient-to-br from-amber-50 to-red-50 rounded-2xl shadow-xl p-6 border-2 border-amber-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Need Help?</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Have questions about your order? Our customer support team is here to help.
                </p>
                <div className="space-y-2">
                  <a
                    href="mailto:support@taptifs.com"
                    className="block text-sm font-medium text-amber-600 hover:text-amber-700"
                  >
                    📧 support@taptifs.com
                  </a>
                  <a
                    href="tel:+919329216544"
                    className="block text-sm font-medium text-amber-600 hover:text-amber-700"
                  >
                    📞 +91-93292 16544
                  </a>
                </div>
              </div>

              {/* Return Policy Info */}
              {isDelivered && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Return Policy</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    {canReturn ? (
                      <>
                        You have <strong>{7 - daysSinceDelivery} days</strong> left to request a
                        return or exchange.
                      </>
                    ) : (
                      <>The 7-day return window for this order has expired.</>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
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
