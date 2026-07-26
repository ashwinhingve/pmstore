'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Truck,
  RefreshCw,
} from 'lucide-react';
import { Badge, statusBadgeVariant } from '@/components/ui/badge';

interface Shipment {
  id: string;
  waybill: string;
  orderNumber: string;
  orderId: string | null;
  customerName: string;
  customerEmail: string;
  status: string;
  courier: string;
  provider: string;
  trackingUrl: string | null;
  origin: string | null;
  destination: string | null;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  createdAt: string;
  lastUpdated: string;
}

interface Filters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

interface PendingOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  paymentMethod: 'cod';
  createdAt: string;
}

interface ShipmentsTableProps {
  shipments: Shipment[];
  totalPages: number;
  currentPage: number;
  filters: Filters;
  statusCounts: Array<{ _id: string; count: number }>;
  pendingOrders?: PendingOrder[];
}

// Filter dropdown options. Keys must match Delhivery's actual shipmentStatus
// strings stored in the DB; the status pill itself is coloured by <Badge>.
const SHIPMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Manifested', label: 'Manifested' },
  { value: 'Dispatched', label: 'Dispatched' },
  { value: 'In Transit', label: 'In transit' },
  { value: 'Out for Delivery', label: 'Out for delivery' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'RTO', label: 'RTO' },
  { value: 'RTO Delivered', label: 'RTO delivered' },
  { value: 'Lost', label: 'Lost' },
  { value: 'Damaged', label: 'Damaged' },
  { value: 'Shipment Created', label: 'Created' },
];

export default function ShipmentsTable({
  shipments,
  totalPages,
  currentPage,
  filters,
  statusCounts,
  pendingOrders = [],
}: ShipmentsTableProps) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localFilters, setLocalFilters] = useState(filters);
  const [providerFilter, setProviderFilter] = useState<'all' | 'delhivery' | 'shiprocket'>('all');
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<Record<string, 'delhivery' | 'shiprocket'>>({});
  const [pendingResults, setPendingResults] = useState<Record<string, string>>({});
  const [isPolling, setIsPolling] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);

  const handlePollTracking = async () => {
    setIsPolling(true);
    setPollResult(null);
    try {
      const res = await fetch('/api/shipping/poll-tracking');
      const data = await res.json();
      if (data.success) {
        setPollResult(`Updated ${data.updated} of ${data.total} shipments`);
        if (data.updated > 0) {
          router.refresh();
        }
      } else {
        setPollResult(data.error || 'Failed to poll');
      }
    } catch (err: any) {
      setPollResult('Error: ' + err.message);
    } finally {
      setIsPolling(false);
      setTimeout(() => setPollResult(null), 5000);
    }
  };

  const updateURL = (newFilters: Partial<Filters>, page = 1) => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);

    router.push(`/admin/shipments?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL({ ...localFilters, search: localSearch });
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    updateURL(localFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const resetFilters = {
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    };
    setLocalFilters(resetFilters);
    setLocalSearch('');
    updateURL(resetFilters);
    setShowFilters(false);
  };

  const hasActiveFilters = filters.status || filters.dateFrom || filters.dateTo || filters.search;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTrackingUrl = (shipment: Shipment) =>
    shipment.trackingUrl || `https://www.delhivery.com/track/package/${shipment.waybill}`;

  const visibleShipments =
    providerFilter === 'all'
      ? shipments
      : shipments.filter((s) => (s.provider || 'delhivery') === providerFilter);

  async function handleCreateShipment(orderId: string) {
    const provider = pendingProvider[orderId] || 'delhivery';
    setCreatingFor(orderId);
    try {
      const res = await fetch('/api/shipping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, provider }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingResults((prev) => ({ ...prev, [orderId]: data.waybill }));
        router.refresh();
      } else {
        setPendingResults((prev) => ({ ...prev, [orderId]: `Error: ${data.error || 'Failed'}` }));
      }
    } catch (err: any) {
      setPendingResults((prev) => ({ ...prev, [orderId]: `Error: ${err.message}` }));
    } finally {
      setCreatingFor(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Pending COD orders — awaiting shipment creation */}
      {pendingOrders.length > 0 && (
        <div className="rounded-lg bg-[var(--paper-card)] shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
          <div className="px-6 py-4 border-b border-[var(--foil-soft)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--mint)] animate-pulse" />
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              Orders awaiting shipment ({pendingOrders.length})
            </h3>
          </div>
          <div className="divide-y divide-[var(--foil-soft)]">
            {pendingOrders.map((order) => {
              const result = pendingResults[order.id];
              const isCreating = creatingFor === order.id;
              const selectedProvider = pendingProvider[order.id] || 'delhivery';

              return (
                <div key={order.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm font-semibold text-[var(--ink)] hover:text-[var(--ink-70)] data" style={{ fontFamily: 'var(--font-data)' }}
                      >
                        {order.orderNumber}
                      </Link>
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--foil-soft)] text-[var(--ink)]">
                        COD
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ink)] mt-0.5">{order.customerName}</p>
                    <p className="text-xs text-[var(--ink-70)]">{order.customerEmail}</p>
                    <p className="text-xs text-[var(--ink-70)] mt-0.5" style={{ fontFamily: 'var(--font-data)' }}>
                      ₹{order.totalAmount.toLocaleString('en-IN')} &middot;{' '}
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  {result ? (
                    <div className={`text-xs font-medium px-3 py-1.5 rounded-md ${
                      result.startsWith('Error')
                        ? 'bg-[var(--foil-soft)] text-[var(--ink)]'
                        : 'bg-[var(--mint-soft)] text-[var(--mint)]'
                    }`}>
                      {result.startsWith('Error') ? result : `Waybill: ${result}`}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={selectedProvider}
                        onChange={(e) =>
                          setPendingProvider((prev) => ({
                            ...prev,
                            [order.id]: e.target.value as 'delhivery' | 'shiprocket',
                          }))
                        }
                        disabled={isCreating}
                        className="text-xs border border-[var(--foil-soft)] rounded px-2 py-1.5 bg-[var(--paper-card)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
                      >
                        <option value="delhivery">Delhivery</option>
                        <option value="shiprocket">Shiprocket</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleCreateShipment(order.id)}
                        disabled={isCreating}
                        className="px-3 py-1.5 bg-[var(--ink)] text-[var(--paper-card)] text-xs font-semibold rounded hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                      >
                        {isCreating ? 'Creating...' : 'Create shipment'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    <div className="rounded-lg bg-[var(--paper-card)] shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
      {/* Search and Filter Bar */}
      <div className="p-4 border-b border-[var(--foil-soft)] space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-40)]" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by waybill or order number..."
                className="w-full pl-10 pr-4 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)] focus:border-transparent"
              />
            </div>
          </form>

          {/* Refresh Tracking Button */}
          <button
            type="button"
            onClick={handlePollTracking}
            disabled={isPolling}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--mint)] bg-[var(--mint-soft)] text-[var(--mint)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
            {isPolling ? 'Updating...' : 'Refresh tracking'}
          </button>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-[var(--foil-soft)] border-[var(--ink)] text-[var(--ink)]'
                : 'bg-[var(--paper-card)] border-[var(--foil-soft)] text-[var(--ink)] hover:bg-[var(--foil-soft)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-[var(--ink)] text-[var(--paper-card)] text-xs rounded-full px-2 py-0.5">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Provider filter */}
        <div className="flex items-center gap-2">
          {(['all', 'delhivery', 'shiprocket'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProviderFilter(p)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                providerFilter === p
                  ? p === 'shiprocket'
                    ? 'bg-[var(--foil-soft)] border-[var(--ink)] text-[var(--ink)]'
                    : p === 'delhivery'
                    ? 'bg-[var(--foil-soft)] border-[var(--ink)] text-[var(--ink)]'
                    : 'bg-[var(--foil-soft)] border-[var(--ink)] text-[var(--ink)]'
                  : 'bg-[var(--paper-card)] border-[var(--foil-soft)] text-[var(--ink-70)] hover:bg-[var(--foil-soft)]'
              }`}
            >
              {p === 'all' ? 'All providers' : p === 'shiprocket' ? 'Shiprocket' : 'Delhivery'}
            </button>
          ))}
        </div>

        {/* Poll Result Message */}
        {pollResult && (
          <div className="text-sm text-[var(--mint)] bg-[var(--mint-soft)] px-3 py-2 rounded-lg">
            {pollResult}
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-[var(--foil-soft)] rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Shipment status
                </label>
                <select
                  value={localFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                >
                  <option value="">All statuses</option>
                  {SHIPMENT_STATUS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Date from
                </label>
                <input
                  type="date"
                  value={localFilters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Date to
                </label>
                <input
                  type="date"
                  value={localFilters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2 bg-[var(--ink)] text-[var(--paper-card)] text-sm font-medium rounded-lg hover:opacity-90"
              >
                Apply filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 border-b border-[var(--foil)] bg-[var(--paper-tint)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Waybill
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Courier
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--foil-soft)]">
            {visibleShipments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[var(--ink-40)]">
                  No shipments yet. Shipment records appear here as orders are dispatched.
                </td>
              </tr>
            ) : (
              visibleShipments.map((shipment) => {
                const provider = shipment.provider || 'delhivery';

                return (
                  <tr key={shipment.id} className="hover:bg-[var(--foil-soft)]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[var(--ink-70)]" />
                        <span className="text-sm font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                          {shipment.waybill}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {shipment.orderId ? (
                        <Link
                          href={`/admin/orders/${shipment.orderId}`}
                          className="text-sm text-[var(--ink)] hover:text-[var(--ink-70)] font-medium data" style={{ fontFamily: 'var(--font-data)' }}
                        >
                          {shipment.orderNumber}
                        </Link>
                      ) : (
                        <span className="text-sm text-[var(--ink-70)] data" style={{ fontFamily: 'var(--font-data)' }}>{shipment.orderNumber}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--ink)]">{shipment.customerName}</div>
                      <div className="text-xs text-[var(--ink-70)]">{shipment.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={statusBadgeVariant(shipment.status)}>
                        {shipment.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--ink)]">{shipment.courier}</div>
                      <span
                        className={`inline-flex mt-1 px-1.5 py-0.5 text-xs font-medium rounded-full ${
                          provider === 'shiprocket'
                            ? 'bg-[var(--foil-soft)] text-[var(--ink)]'
                            : 'bg-[var(--foil-soft)] text-[var(--ink)]'
                        }`}
                      >
                        {provider === 'shiprocket' ? 'Shiprocket' : 'Delhivery'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--ink-70)] data" style={{ fontFamily: 'var(--font-data)' }}>
                      {formatDate(shipment.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {shipment.orderId && (
                          <Link
                            href={`/admin/orders/${shipment.orderId}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        <a
                          href={getTrackingUrl(shipment)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-[var(--foil-soft)] flex items-center justify-between">
          <div className="text-sm text-[var(--ink-70)] data" style={{ fontFamily: 'var(--font-data)' }}>
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => updateURL(filters, currentPage - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm font-medium text-[var(--ink)] hover:bg-[var(--foil-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => updateURL(filters, currentPage + 1)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm font-medium text-[var(--ink)] hover:bg-[var(--foil-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
