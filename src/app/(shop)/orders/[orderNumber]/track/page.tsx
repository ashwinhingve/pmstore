import { requireAuth } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Shipment from '@/models/Shipment';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react';

function getCourierTrackingUrl(provider: string, waybill: string, storedUrl?: string): string {
  if (storedUrl) return storedUrl;
  switch (provider?.toLowerCase()) {
    case 'shiprocket':
      return `https://shiprocket.co/tracking/${waybill}`;
    case 'delhivery':
    default:
      return `https://www.delhivery.com/track/package/${waybill}`;
  }
}

function getCourierDisplayName(provider: string, courierName?: string): string {
  if (courierName) return courierName;
  switch (provider?.toLowerCase()) {
    case 'shiprocket': return 'Shiprocket';
    case 'delhivery': return 'Delhivery';
    default: return 'Courier Partner';
  }
}

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

function getStatusColor(status: string) {
  const s = status?.toLowerCase() || '';
  if (s.includes('deliver') || s.includes('transit')) return 'text-green-700 bg-green-50 border-green-200';
  if (s.includes('out') || s.includes('dispatch')) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (s.includes('fail') || s.includes('return') || s.includes('undeliver')) return 'text-red-700 bg-red-50 border-red-200';
  return 'text-amber-700 bg-amber-50 border-amber-200';
}

function getStatusIcon(status: string) {
  const s = status?.toLowerCase() || '';
  if (s.includes('deliver')) return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (s.includes('transit') || s.includes('dispatch') || s.includes('out')) return <Truck className="w-5 h-5 text-blue-600" />;
  if (s.includes('fail') || s.includes('return')) return <AlertCircle className="w-5 h-5 text-red-600" />;
  return <Package className="w-5 h-5 text-amber-600" />;
}

export default async function OrderTrackPage({ params }: PageProps) {
  const session = await requireAuth();
  const { orderNumber } = await params;

  await connectDB();

  const order = await Order.findOne({ orderNumber, userId: session.user.id }).lean();

  if (!order) {
    notFound();
  }

  const o = order as any;

  const shipment = o.trackingNumber
    ? await Shipment.findOne({ waybill: o.trackingNumber }).lean()
    : null;

  const s = shipment as any;

  const scans: Array<{ status: string; location: string; timestamp: Date; remarks?: string }> =
    s?.scans || [];

  // Sort newest first
  const sortedScans = [...scans].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Back link */}
        <Link
          href={`/orders/${orderNumber}`}
          className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Order Details
        </Link>

        <h1 className="text-3xl font-bold mb-2">
          <span className="bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
            Track Order #{orderNumber}
          </span>
        </h1>

        {!o.trackingNumber ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 mt-6 text-center">
            <Package className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Not Yet Shipped</h2>
            <p className="text-gray-600">
              Your order is being prepared. Tracking details will appear here once it ships.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Order Status: <span className="capitalize font-semibold text-amber-700">{o.orderStatus}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Tracking Summary Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tracking Number</p>
                  <p className="font-mono text-lg font-bold text-gray-900">{o.trackingNumber}</p>
                </div>
                {s?.courierName && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Courier</p>
                    <p className="font-semibold text-gray-900">{s.courierName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(s?.shipmentStatus || o.orderStatus)}`}>
                    {getStatusIcon(s?.shipmentStatus || o.orderStatus)}
                    {s?.shipmentStatus || o.orderStatus}
                  </span>
                </div>
              </div>

              {s?.currentLocation && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Current Location: <strong className="text-gray-900">{s.currentLocation}</strong></span>
                </div>
              )}

              {(o.estimatedDeliveryDate || s?.estimatedDelivery) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Estimated Delivery:{' '}
                    <strong className="text-gray-900">
                      {new Date(o.estimatedDeliveryDate || s.estimatedDelivery).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>
              )}

              {s?.deliveryDate && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Delivered on:{' '}
                    <strong>
                      {new Date(s.deliveryDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <a
                  href={getCourierTrackingUrl(s?.provider || o.shippingProvider || 'delhivery', o.trackingNumber, s?.trackingUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700"
                >
                  <Truck className="w-4 h-4" />
                  Track on {getCourierDisplayName(s?.provider || o.shippingProvider, s?.courierName)}
                </a>
              </div>
            </div>

            {/* Scan Timeline */}
            {sortedScans.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-600" />
                  Shipment Timeline
                </h2>

                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

                  <div className="space-y-6">
                    {sortedScans.map((scan, idx) => (
                      <div key={idx} className="relative flex gap-4">
                        {/* Dot */}
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                          idx === 0 ? 'bg-amber-600 border-amber-600' : 'bg-white border-gray-300'
                        }`}>
                          {idx === 0 ? (
                            <Package className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <p className={`font-semibold text-sm ${idx === 0 ? 'text-amber-700' : 'text-gray-800'}`}>
                              {scan.status}
                            </p>
                            <p className="text-xs text-gray-500 shrink-0">
                              {new Date(scan.timestamp).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {scan.location && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                              <p className="text-xs text-gray-500">{scan.location}</p>
                            </div>
                          )}
                          {scan.remarks && (
                            <p className="text-xs text-gray-400 mt-0.5">{scan.remarks}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
                <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <p className="text-gray-600">Tracking events will appear here once the shipment is picked up.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
