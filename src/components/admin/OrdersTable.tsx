'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  RefreshCw,
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  itemsCount: number;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  waybill: string | null;
}

interface Filters {
  search: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: string;
}

interface OrdersTableProps {
  orders: Order[];
  totalPages: number;
  currentPage: number;
  filters: Filters;
  statusCounts: Array<{ _id: string; count: number }>;
  paymentStatusCounts: Array<{ _id: string; count: number }>;
}

const statusColorMap: Record<string, string> = {
  success: 'bg-[var(--mint-soft)] text-[var(--mint)]',
  paid: 'bg-[var(--mint-soft)] text-[var(--mint)]',
  pending: 'bg-[var(--foil-soft)] text-[var(--ink-70)]',
  failed: 'bg-[var(--foil-soft)] text-[var(--ink)]',
  refunded: 'bg-[var(--foil-soft)] text-[var(--ink)]',
  confirmed: 'bg-[var(--foil-soft)] text-[var(--ink)]',
  processing: 'bg-[var(--foil-soft)] text-[var(--ink-70)]',
  shipped: 'bg-[var(--foil-soft)] text-[var(--ink)]',
  delivered: 'bg-[var(--mint-soft)] text-[var(--mint)]',
  cancelled: 'bg-[var(--foil-soft)] text-[var(--ink)]',
};

export default function OrdersTable({
  orders,
  totalPages,
  currentPage,
  filters,
  statusCounts,
  paymentStatusCounts,
}: OrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localFilters, setLocalFilters] = useState(filters);

  const updateURL = (newFilters: Partial<Filters>, page = 1) => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.paymentStatus) params.set('paymentStatus', newFilters.paymentStatus);
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);
    if (newFilters.sortBy) params.set('sortBy', newFilters.sortBy);
    if (newFilters.sortOrder) params.set('sortOrder', newFilters.sortOrder);

    router.push(`/admin/orders?${params.toString()}`);
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
      paymentStatus: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    setLocalFilters(resetFilters);
    setLocalSearch('');
    updateURL(resetFilters);
    setShowFilters(false);
  };

  const hasActiveFilters =
    filters.status ||
    filters.paymentStatus ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search;

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSyncPayments = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/sync/payments', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`Synced ${data.updated} of ${data.total} pending orders`);
        if (data.updated > 0) {
          router.refresh();
        }
      } else {
        setSyncResult(data.error || 'Sync failed');
      }
    } catch (err: any) {
      setSyncResult('Error: ' + err.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncResult(null), 6000);
    }
  };

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

  return (
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
                placeholder="Search by order number or email..."
                className="w-full pl-10 pr-4 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)] focus:border-transparent"
              />
            </div>
          </form>

          {/* Sync Payments Button */}
          <button
            type="button"
            onClick={handleSyncPayments}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--mint)] bg-[var(--mint-soft)] text-[var(--mint)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
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

        {/* Sync Result Message */}
        {syncResult && (
          <div className="text-sm text-[var(--mint)] bg-[var(--mint-soft)] px-3 py-2 rounded-lg">
            {syncResult}
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-[var(--foil-soft)] rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Order Status */}
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Order status
                </label>
                <select
                  value={localFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Payment status
                </label>
                <select
                  value={localFilters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                >
                  <option value="">All payments</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
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
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--foil-soft)]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-[var(--ink-40)]">
                  No orders yet. New orders appear here the moment they're placed.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-[var(--foil-soft)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                      {order.orderNumber}
                    </div>
                    {order.waybill && (
                      <div className="text-xs text-[var(--ink-70)] data" style={{ fontFamily: 'var(--font-data)' }}>AWB: {order.waybill}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[var(--ink)]">{order.customerName}</div>
                    <div className="text-xs text-[var(--ink-70)]">{order.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>{order.itemsCount} items</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        statusColorMap[order.paymentStatus] || 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        statusColorMap[order.orderStatus] || 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                      }`}
                    >
                      {order.orderStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--ink-70)] data" style={{ fontFamily: 'var(--font-data)' }}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                  </td>
                </tr>
              ))
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
  );
}
