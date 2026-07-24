import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import Shipment from '@/models/Shipment';
import { notFound } from 'next/navigation';
import OrderStatusManager from '@/components/admin/OrderStatusManager';
import OrderDetailsCard from '@/components/admin/OrderDetailsCard';
import OrderItemsList from '@/components/admin/OrderItemsList';
import OrderTimelineAdmin from '@/components/admin/OrderTimelineAdmin';
import CreateShipmentButton from '@/components/admin/CreateShipmentButton';
import ShipmentScanTimeline from '@/components/admin/ShipmentScanTimeline';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function AdminOrderDetailsPage({ params }: PageProps) {
  // Ensure user is admin
  await requireAdmin();

  // Connect to database
  await connectDB();

  const { orderId } = await params;

  // Fetch order with related data
  const order = await Order.findById(orderId)
    .populate('userId', 'name email')
    .populate('items')
    .populate('shippingAddressId')
    .populate('billingAddressId')
    .lean() as any;

  if (!order) {
    notFound();
  }

  // Fetch related transaction
  const transaction = await Transaction.findOne({ orderNumber: order.orderNumber }).lean() as any;

  // Fetch related shipment
  const shipment = await Shipment.findOne({ orderId: order._id }).lean() as any;

  // Transform data for client components
  const orderData = {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost || 0,
    tax: order.taxAmount || 0,
    discount: order.discountAmount || 0,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt?.toISOString() || order.createdAt.toISOString(),

    // Customer info
    customer: {
      id: order.userId?._id?.toString() || null,
      name: order.userId?.name || order.shippingAddressId?.fullName || 'Guest',
      email: order.userId?.email || 'N/A',
    },

    // Shipping address (populated from shippingAddressId ref)
    shippingAddress: {
      name: order.shippingAddressId?.fullName || '',
      phone: order.shippingAddressId?.phoneNumber || '',
      email: order.userId?.email || '',
      addressLine1: order.shippingAddressId?.addressLine1 || '',
      addressLine2: order.shippingAddressId?.addressLine2 || '',
      city: order.shippingAddressId?.city || '',
      state: order.shippingAddressId?.state || '',
      postalCode: order.shippingAddressId?.postalCode || '',
      country: order.shippingAddressId?.country || 'India',
    },

    // Billing address (populated from billingAddressId ref)
    billingAddress: order.billingAddressId || order.shippingAddressId,

    // Items (populated from OrderItem refs)
    items: order.items?.map((item: any) => ({
      productId: item.productId?.toString() || '',
      productName: item.productName || '',
      sku: item.productSku || '',
      quantity: item.quantity || 0,
      price: item.priceAtPurchase || 0,
      total: item.subtotal || (item.quantity || 0) * (item.priceAtPurchase || 0),
      image: item.productImage || '',
    })) || [],

    // Payment info (prefer transaction's paymentMethod as it reflects actual payment)
    paymentMethod: transaction?.paymentMethod || order.paymentMethod || 'N/A',
    transactionId: transaction?.transactionId || null,
    bankTransactionId: transaction?.bankTransactionId || null,
    paymentDate: transaction?.updatedAt?.toISOString() || transaction?.createdAt?.toISOString() || null,

    // Shipping info
    waybill: shipment?.waybill || order.trackingNumber || null,
    courier: shipment?.courierName || null,
    provider: shipment?.provider || null,
    trackingUrl: shipment?.trackingUrl || (shipment?.waybill ? `https://www.delhivery.com/track/package/${shipment.waybill}` : null),
    estimatedDelivery: null,
    shipmentStatus: shipment?.shipmentStatus || null,
    shipmentDate: shipment?.createdAt?.toISOString() || null,
    scans: shipment?.scans?.map((s: any) => ({
      status: s.status,
      location: s.location || '',
      timestamp: s.timestamp?.toISOString() || new Date().toISOString(),
      remarks: s.remarks || '',
    })) || [],
    showCreateShipment:
      !shipment &&
      (order.paymentStatus === 'paid' ||
        (order.paymentMethod === 'cod' && order.orderStatus === 'confirmed')),

    // Admin fields
    internalNotes: order.internalNotes || null,
    cancelledReason: order.refundReason || null,
    lastStatusUpdate: order.lastStatusUpdate?.toISOString() || null,

    // Refund / cancellation fields
    refundAmount: order.refundAmount || 0,
    refundedAt: order.refundedAt?.toISOString() || null,
    cancelledAt: order.cancelledAt?.toISOString() || null,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="p-2 hover:bg-[var(--foil-soft)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--ink-70)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--ink)]">
              Order <span style={{ fontFamily: 'var(--font-data)' }}>{orderData.orderNumber}</span>
            </h1>
            <p className="text-sm text-[var(--ink-70)] mt-1">
              Placed on {new Date(orderData.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 border border-[var(--foil-soft)] rounded-lg text-sm font-medium text-[var(--ink)] hover:bg-[var(--foil-soft)]"
          >
            Print order
          </button>
          <a
            href={`/api/orders/${orderId}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[var(--paper-card)] border border-[var(--foil-soft)] rounded-lg text-sm font-medium text-[var(--ink)] hover:bg-[var(--foil-soft)]"
          >
            Download invoice
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <OrderItemsList items={orderData.items} />

          {/* Order Timeline */}
          <OrderTimelineAdmin
            orderStatus={orderData.orderStatus}
            paymentStatus={orderData.paymentStatus}
            createdAt={orderData.createdAt}
            shipmentDate={orderData.shipmentDate}
            lastStatusUpdate={orderData.lastStatusUpdate}
          />

          {/* Shipping Information */}
          <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
            <h3 className="text-lg font-semibold text-[var(--ink)] mb-4">
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
                  <p className="text-sm font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                    {orderData.shippingAddress.phone}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-[var(--ink-70)]">Address</p>
                <p className="text-sm font-medium text-[var(--ink)]">
                  {orderData.shippingAddress.addressLine1}
                  {orderData.shippingAddress.addressLine2 && (
                    <>, {orderData.shippingAddress.addressLine2}</>
                  )}
                </p>
                <p className="text-sm font-medium text-[var(--ink)]">
                  {orderData.shippingAddress.city}, {orderData.shippingAddress.state}{' '}
                  <span style={{ fontFamily: 'var(--font-data)' }}>{orderData.shippingAddress.postalCode}</span>
                </p>
              </div>

              {orderData.waybill && (
                <>
                  <div className="border-t border-[var(--foil-soft)] pt-3 mt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-[var(--ink-70)]">Waybill number</p>
                        <p className="text-sm font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                          {orderData.waybill}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--ink-70)]">Courier</p>
                        <div className="flex items-center gap-2">
                          {orderData.courier && (
                            <p className="text-sm font-medium text-[var(--ink)]">
                              {orderData.courier}
                            </p>
                          )}
                          {orderData.provider && (
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                orderData.provider === 'shiprocket'
                                  ? 'bg-[var(--foil-soft)] text-[var(--ink)]'
                                  : 'bg-[var(--foil-soft)] text-[var(--ink)]'
                              }`}
                            >
                              {orderData.provider === 'shiprocket' ? 'Shiprocket' : 'Delhivery'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {orderData.trackingUrl && (
                    <a
                      href={orderData.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
                    >
                      Track shipment
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </>
              )}

            </div>
          </div>

          {/* Scan Timeline */}
          {orderData.scans.length > 0 && (
            <ShipmentScanTimeline
              scans={orderData.scans}
              provider={orderData.provider || 'delhivery'}
            />
          )}

          {/* Payment Information */}
          <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
            <h3 className="text-lg font-semibold text-[var(--ink)] mb-4">
              Payment information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--ink-70)]">Payment method</p>
                  <p className="text-sm font-medium text-[var(--ink)] uppercase data" style={{ fontFamily: 'var(--font-data)' }}>
                    {orderData.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--ink-70)]">Payment status</p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      orderData.paymentStatus === 'paid' || orderData.paymentStatus === 'success'
                        ? 'bg-[var(--mint-soft)] text-[var(--mint)]'
                        : orderData.paymentStatus === 'refunded'
                        ? 'bg-[var(--foil-soft)] text-[var(--ink)]'
                        : orderData.paymentStatus === 'pending'
                        ? 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                        : 'bg-[var(--foil-soft)] text-[var(--ink)]'
                    }`}
                  >
                    {orderData.paymentStatus}
                  </span>
                </div>
              </div>
              {orderData.transactionId && (
                <div>
                  <p className="text-sm text-[var(--ink-70)]">Transaction ID</p>
                  <p className="text-sm font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                    {orderData.transactionId}
                  </p>
                </div>
              )}
              {orderData.bankTransactionId && (
                <div>
                  <p className="text-sm text-[var(--ink-70)]">Bank transaction ID</p>
                  <p className="text-sm font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                    {orderData.bankTransactionId}
                  </p>
                </div>
              )}
              {/* Refund information */}
              {orderData.refundAmount > 0 && (
                <div className="border-t border-[var(--foil-soft)] pt-3 mt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[var(--ink-70)]">Refund amount</p>
                      <p className="text-sm font-semibold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                        ₹{orderData.refundAmount.toLocaleString()}
                      </p>
                    </div>
                    {orderData.refundedAt && (
                      <div>
                        <p className="text-sm text-[var(--ink-70)]">Refund initiated</p>
                        <p className="text-sm font-medium text-[var(--ink)]">
                          {new Date(orderData.refundedAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--ink-70)] animate-pulse"></span>
                    <p className="text-xs text-[var(--ink-70)] font-medium">Refund processing — typically 5–7 business days</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Right Column (1/3) */}
        <div className="space-y-6">
          {/* Order Status Manager */}
          <OrderStatusManager
            orderId={orderData.id}
            currentStatus={orderData.orderStatus}
            paymentStatus={orderData.paymentStatus}
            refundAmount={orderData.refundAmount}
            refundedAt={orderData.refundedAt}
            cancelledAt={orderData.cancelledAt}
          />

          {/* Create Shipment — shown when no shipment exists and order is eligible */}
          {orderData.showCreateShipment && (
            <CreateShipmentButton
              orderId={orderData.id}
              orderNumber={orderData.orderNumber}
              paymentMethod={orderData.paymentMethod}
            />
          )}

          {/* Order Summary */}
          <OrderDetailsCard orderData={orderData} />

          {/* Customer Details */}
          <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
            <h3 className="text-lg font-semibold text-[var(--ink)] mb-4">Customer</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-[var(--ink-70)]">Name</p>
                <p className="text-sm font-medium text-[var(--ink)]">
                  {orderData.customer.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--ink-70)]">Email</p>
                <p className="text-sm font-medium text-[var(--ink)]">
                  {orderData.customer.email}
                </p>
              </div>
              {orderData.customer.id && (
                <Link
                  href={`/admin/users/${orderData.customer.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
                >
                  View customer profile
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          {orderData.internalNotes && (
            <div className="bg-[var(--foil-soft)] rounded-lg border border-[var(--foil)] p-6">
              <h3 className="text-lg font-semibold text-[var(--ink)] mb-2">
                Internal notes
              </h3>
              <p className="text-sm text-[var(--ink-70)]">{orderData.internalNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
