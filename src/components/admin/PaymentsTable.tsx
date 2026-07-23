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
  AlertCircle,
  CheckCircle,
  Clock,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

interface Transaction {
  id: string;
  transactionId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentMethod: string;
  status: string;
  bankTransactionId: string | null;
  failureReason: string | null;
  createdAt: string;
  orderId: string | null;
}

interface Filters {
  search: string;
  status: string;
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

interface PaymentsTableProps {
  transactions: Transaction[];
  totalPages: number;
  currentPage: number;
  filters: Filters;
  statusCounts: Array<{ _id: string; count: number }>;
  paymentMethodCounts: Array<{ _id: string; count: number }>;
}

const statusConfig = {
  success: {
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  pending: {
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  failed: {
    color: 'bg-red-100 text-red-700',
    icon: AlertCircle,
  },
  refunded: {
    color: 'bg-purple-100 text-purple-700',
    icon: RotateCcw,
  },
};

export default function PaymentsTable({
  transactions,
  totalPages,
  currentPage,
  filters,
  statusCounts,
  paymentMethodCounts,
}: PaymentsTableProps) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localFilters, setLocalFilters] = useState(filters);
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

  const updateURL = (newFilters: Partial<Filters>, page = 1) => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.paymentMethod) params.set('paymentMethod', newFilters.paymentMethod);
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);
    if (newFilters.amountMin) params.set('amountMin', newFilters.amountMin);
    if (newFilters.amountMax) params.set('amountMax', newFilters.amountMax);

    router.push(`/admin/payments?${params.toString()}`);
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
      paymentMethod: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
    };
    setLocalFilters(resetFilters);
    setLocalSearch('');
    updateURL(resetFilters);
    setShowFilters(false);
  };

  const hasActiveFilters =
    filters.status ||
    filters.paymentMethod ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.amountMin ||
    filters.amountMax ||
    filters.search;

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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Search and Filter Bar */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by transaction ID or order number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Sync Payments Button */}
          <button
            type="button"
            onClick={handleSyncPayments}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-green-500 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Payments'}
          </button>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-amber-50 border-amber-500 text-amber-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-amber-600 text-white text-xs rounded-full px-2 py-0.5">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Sync Result Message */}
        {syncResult && (
          <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            {syncResult}
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  value={localFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={localFilters.paymentMethod}
                  onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Methods</option>
                  {paymentMethodCounts.map((method) => (
                    <option key={method._id} value={method._id}>
                      {method._id || 'N/A'} ({method.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={localFilters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={localFilters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Amount Min */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Amount (₹)
                </label>
                <input
                  type="number"
                  value={localFilters.amountMin}
                  onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Amount Max */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Amount (₹)
                </label>
                <input
                  type="number"
                  value={localFilters.amountMax}
                  onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                  placeholder="999999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-red-700 text-white text-sm font-medium rounded-lg hover:from-amber-700 hover:to-red-800"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Transaction ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const StatusIcon = statusConfig[txn.status as keyof typeof statusConfig]?.icon || AlertCircle;
                const statusColor = statusConfig[txn.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-700';

                return (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {txn.transactionId}
                      </div>
                      {txn.bankTransactionId && (
                        <div className="text-xs text-gray-500 font-mono">
                          Bank: {txn.bankTransactionId}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {txn.orderId ? (
                        <Link
                          href={`/admin/orders/${txn.orderId}`}
                          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                        >
                          {txn.orderNumber}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">{txn.orderNumber}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{txn.customerName}</div>
                      <div className="text-xs text-gray-500">{txn.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ₹{txn.amount.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{txn.paymentMethod}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {txn.status}
                      </span>
                      {txn.failureReason && (
                        <div className="text-xs text-red-600 mt-1">{txn.failureReason}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(txn.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {txn.orderId && (
                        <Link
                          href={`/admin/orders/${txn.orderId}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
                        >
                          <Eye className="w-4 h-4" />
                          View Order
                        </Link>
                      )}
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
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => updateURL(filters, currentPage - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => updateURL(filters, currentPage + 1)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
