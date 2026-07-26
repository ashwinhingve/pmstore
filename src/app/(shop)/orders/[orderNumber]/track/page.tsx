import { requireAuth } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Shipment from '@/models/Shipment';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react';
import { ShippingArt } from '@/components/illustrations';

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
  if (s.includes('deliver') || s.includes('transit')) return 'text-[var(--mint)] bg-[var(--mint-soft)] border-[var(--mint-soft)]';
  if (s.includes('out') || s.includes('dispatch')) return 'text-[var(--ink-70)] bg-[var(--foil-soft)] border-[var(--foil-soft)]';
  if (s.includes('fail') || s.includes('return') || s.includes('undeliver')) return 'text-[var(--ink-70)] bg-[var(--foil-soft)] border-[var(--foil-soft)]';
  return 'text-[var(--ink-70)] bg-[var(--foil-soft)] border-[var(--foil-soft)]';
}

function getStatusIcon(status: string) {
  const s = status?.toLowerCase() || '';
  if (s.includes('deliver')) return <CheckCircle className="w-5 h-5 text-[var(--mint)]" />;
  if (s.includes('transit') || s.includes('dispatch') || s.includes('out')) return <Truck className="w-5 h-5 text-[var(--ink-70)]" />;
  if (s.includes('fail') || s.includes('return')) return <AlertCircle className="w-5 h-5 text-[var(--ink-70)]" />;
  return <Package className="w-5 h-5 text-[var(--ink-70)]" />;
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
    <div className="min-h-screen bg-[var(--paper)] py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Back link */}
        <Link
          href={`/orders/${orderNumber}`}
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-[var(--mint)] transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to order details
        </Link>

        <h1 className="data mb-2 text-[length:var(--step-2)] font-bold text-[var(--ink)]">
          Track order #{orderNumber}
        </h1>

        {!o.trackingNumber ? (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-8 text-center shadow-[var(--shadow-sm)]">
            <ShippingArt className="mx-auto mb-4 w-44" />
            <h2 className="mb-2 text-xl font-bold text-[var(--ink)]">Not shipped yet</h2>
            <p className="text-[var(--ink-70)]">
              Your order is being prepared. Tracking details will appear here once it ships.
            </p>
            <p className="mt-2 text-sm text-[var(--ink-70)]">
              Order status: <span className="font-semibold capitalize text-[var(--mint)]">{o.orderStatus}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Tracking Summary Card */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="mb-1 text-sm text-[var(--ink-70)]">Tracking number</p>
                  <p className="data text-lg font-bold text-[var(--ink)]">{o.trackingNumber}</p>
                </div>
                {s?.courierName && (
                  <div>
                    <p className="text-sm text-[var(--ink-70)] mb-1">Courier</p>
                    <p className="font-semibold text-[var(--ink)]">{s.courierName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-[var(--ink-70)] mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(s?.shipmentStatus || o.orderStatus)}`}>
                    {getStatusIcon(s?.shipmentStatus || o.orderStatus)}
                    {s?.shipmentStatus || o.orderStatus}
                  </span>
                </div>
              </div>

              {s?.currentLocation && (
                <div className="mt-4 flex items-center gap-2 text-sm text-[var(--ink-70)]">
                  <MapPin className="w-4 h-4 text-[var(--mint)] shrink-0" />
                  <span>Current Location: <strong className="text-[var(--ink)]">{s.currentLocation}</strong></span>
                </div>
              )}

              {(o.estimatedDeliveryDate || s?.estimatedDelivery) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-[var(--ink-70)]">
                  <Clock className="w-4 h-4 text-[var(--mint)] shrink-0" />
                  <span>
                    Estimated Delivery:{' '}
                    <strong className="text-[var(--ink)]">
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
                <div className="mt-2 flex items-center gap-2 text-sm text-[var(--mint)]">
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

              <div className="mt-4 pt-4 border-t border-[var(--foil-soft)]">
                <a
                  href={getCourierTrackingUrl(s?.provider || o.shippingProvider || 'delhivery', o.trackingNumber, s?.trackingUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--mint)] hover:opacity-90"
                >
                  <Truck className="w-4 h-4" />
                  Track on {getCourierDisplayName(s?.provider || o.shippingProvider, s?.courierName)}
                </a>
              </div>
            </div>

            {/* Scan Timeline */}
            {sortedScans.length > 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[var(--ink)]">
                  <Package className="h-5 w-5 text-[var(--mint)]" aria-hidden="true" />
                  Shipment timeline
                </h2>

                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[var(--foil-soft)]" />

                  <div className="space-y-6">
                    {sortedScans.map((scan, idx) => (
                      <div key={idx} className="relative flex gap-4">
                        {/* Dot */}
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                          idx === 0 ? 'bg-[var(--mint)] border-[var(--mint)]' : 'bg-[var(--paper-card)] border-[var(--foil-soft)]'
                        }`}>
                          {idx === 0 ? (
                            <Package className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-[var(--ink-70)]" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <p className={`font-semibold text-sm ${idx === 0 ? 'text-[var(--mint)]' : 'text-[var(--ink)]'}`}>
                              {scan.status}
                            </p>
                            <p className="text-xs text-[var(--ink-70)] shrink-0">
                              {new Date(scan.timestamp).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Kolkata',
                              })}
                            </p>
                          </div>
                          {scan.location && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[var(--ink-40)] shrink-0" />
                              <p className="text-xs text-[var(--ink-70)]">{scan.location}</p>
                            </div>
                          )}
                          {scan.remarks && (
                            <p className="text-xs text-[var(--ink-40)] mt-0.5">{scan.remarks}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)] text-center">
                <Clock className="w-12 h-12 text-[var(--ink-40)] mx-auto mb-3" />
                <p className="text-[var(--ink-70)]">Tracking events will appear here once the shipment is picked up.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
