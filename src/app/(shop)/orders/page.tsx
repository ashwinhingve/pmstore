"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { Button } from '@/components/ui/button';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ShippingArt } from '@/components/illustrations';
import { format } from 'date-fns';

interface Order {
  _id: string;
  orderNumber: string;
  items: any[];
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  trackingNumber?: string;
  waybill?: string;
  createdAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalOrders: number;
}

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/orders');
    } else if (status === 'authenticated') {
      fetchOrders();
    }
  }, [status]);

  async function fetchOrders(page = 1) {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (filter !== 'all') params.set('status', filter);
      if (searchQuery) params.set('search', searchQuery);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('page', page.toString());
      params.set('limit', '10');

      const url = `/api/orders?${params.toString()}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setPagination({
          currentPage: data.currentPage || 1,
          totalPages: data.totalPages || 1,
          totalOrders: data.totalOrders || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrders(1);
    }
  }, [filter, searchQuery, dateFrom, dateTo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const handleClearFilters = () => {
    setFilter('all');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setShowFilters(false);
  };

  const hasActiveFilters = filter !== 'all' || searchQuery || dateFrom || dateTo;

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--paper)] py-12">
        <div className="mx-auto max-w-5xl px-4" aria-hidden="true">
          <div className="animate-shimmer mb-2 h-9 w-48 rounded-[var(--radius-sm)]" />
          <div className="animate-shimmer mb-8 h-5 w-64 rounded-[var(--radius-sm)]" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-shimmer h-36 rounded-[var(--radius-md)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-[var(--mint)]" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-[var(--ink-70)]" />;
      case 'cancelled':
      case 'refunded':
        return <XCircle className="w-5 h-5 text-[var(--ink-70)]" />;
      case 'pending':
      case 'confirmed':
      case 'processing':
        return <Clock className="w-5 h-5 text-[var(--ink-70)]" />;
      default:
        return <Package className="w-5 h-5 text-[var(--mint)]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-[var(--mint-soft)] text-[var(--mint)]';
      case 'shipped':
        return 'bg-[var(--foil-soft)] text-[var(--ink-70)]';
      case 'cancelled':
      case 'refunded':
        return 'bg-[var(--foil-soft)] text-[var(--ink-70)]';
      case 'pending':
        return 'bg-[var(--foil-soft)] text-[var(--ink-70)]';
      case 'confirmed':
      case 'processing':
        return 'bg-[var(--foil-soft)] text-[var(--ink-70)]';
      default:
        return 'bg-[var(--mint-soft)] text-[var(--mint)]';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] py-12">
      <div className="container mx-auto px-4">
        <AnimatedSection direction="up">
          {/* Header */}
          <div className="mx-auto mb-8 max-w-5xl">
            <h1 className="mb-1 text-[length:var(--step-2)] text-[var(--ink)]">Your orders</h1>
            <p className="text-[var(--ink-70)]">
              Track and manage your orders
              {pagination.totalOrders > 0 && (
                <span className="data"> ({pagination.totalOrders} total)</span>
              )}
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <form onSubmit={handleSearch} className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-40)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by order number..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-[var(--foil-soft)] focus:border-[var(--mint)] focus:outline-none text-sm"
                    />
                  </div>
                </form>

                {/* Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-colors ${
                    hasActiveFilters
                      ? 'bg-[var(--mint-soft)] border-[var(--mint)] text-[var(--mint)]'
                      : 'bg-[var(--paper-card)] border-[var(--foil-soft)] text-[var(--ink-70)] hover:bg-[var(--foil-soft)]'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="bg-[var(--mint)] text-white text-xs rounded-full px-2 py-0.5">
                      Active
                    </span>
                  )}
                </button>

              </div>

              {/* Expanded Filters */}
              {showFilters && (
                <div className="bg-[var(--paper-card)] rounded-xl border-2 border-[var(--foil-soft)] p-6 space-y-4">
                  {/* Status Filters */}
                  <div>
                    <label className="block text-sm font-semibold text-[var(--ink)] mb-3">
                      Order Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                        size="sm"
                        className={filter === 'all' ? 'bg-[var(--mint)] hover:bg-opacity-90' : ''}
                      >
                        All orders
                      </Button>
                      <Button
                        variant={filter === 'confirmed' ? 'default' : 'outline'}
                        onClick={() => setFilter('confirmed')}
                        size="sm"
                        className={filter === 'confirmed' ? 'bg-[var(--mint)] hover:bg-opacity-90' : ''}
                      >
                        Confirmed
                      </Button>
                      <Button
                        variant={filter === 'processing' ? 'default' : 'outline'}
                        onClick={() => setFilter('processing')}
                        size="sm"
                        className={filter === 'processing' ? 'bg-[var(--mint)] hover:bg-opacity-90' : ''}
                      >
                        Processing
                      </Button>
                      <Button
                        variant={filter === 'shipped' ? 'default' : 'outline'}
                        onClick={() => setFilter('shipped')}
                        size="sm"
                        className={filter === 'shipped' ? 'bg-[var(--mint)] hover:bg-opacity-90' : ''}
                      >
                        Shipped
                      </Button>
                      <Button
                        variant={filter === 'delivered' ? 'default' : 'outline'}
                        onClick={() => setFilter('delivered')}
                        size="sm"
                        className={filter === 'delivered' ? 'bg-[var(--mint)] hover:bg-opacity-90' : ''}
                      >
                        Delivered
                      </Button>
                    </div>
                  </div>

                  {/* Date Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--ink)] mb-2">
                        From date
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-[var(--foil-soft)] focus:border-[var(--mint)] focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--ink)] mb-2">
                        To date
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-[var(--foil-soft)] focus:border-[var(--mint)] focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Filter Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--foil-soft)]">
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="min-h-11 px-4 py-2 text-sm font-medium text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--ink)]"
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="min-h-11 rounded-[var(--radius-sm)] bg-[var(--mint)] px-4 py-2 text-sm font-medium text-[var(--paper-card)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--mint-deep)]"
                    >
                      Apply filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-12 text-center shadow-[var(--shadow-sm)]">
                <ShippingArt className="mx-auto mb-6 w-52" />
                <h2 className="mb-2 text-[length:var(--step-1)] text-[var(--ink)]">
                  {hasActiveFilters ? 'No orders match these filters' : 'No orders yet'}
                </h2>
                <p className="mb-6 text-[var(--ink-70)]">
                  {hasActiveFilters
                    ? 'Try a different status or date range.'
                    : 'Order the medicines you need and track them here.'}
                </p>
                {hasActiveFilters ? (
                  <Button onClick={handleClearFilters} className="bg-[var(--mint)] hover:bg-[var(--mint-deep)]">
                    Clear filters
                  </Button>
                ) : (
                  <Link href="/products">
                    <Button className="bg-[var(--mint)] hover:bg-[var(--mint-deep)]">
                      Browse medicines
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] hover:shadow-[var(--shadow-md)]"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Order Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {getStatusIcon(order.orderStatus)}
                            <div>
                              <h3 className="data text-lg font-bold text-[var(--ink)]">
                                Order #{order.orderNumber}
                              </h3>
                              <p className="data text-sm text-[var(--ink-70)]">
                                Placed on {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[var(--ink-70)]">Items</p>
                              <p className="data font-semibold text-[var(--ink)]">{order.items.length}</p>
                            </div>
                            <div>
                              <p className="text-[var(--ink-70)]">Total</p>
                              <p className="data font-bold text-[var(--ink)]">₹{order.totalAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[var(--ink-70)]">Status</p>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.orderStatus)}`}>
                                {order.orderStatus}
                              </span>
                            </div>
                            <div>
                              <p className="text-[var(--ink-70)]">Payment</p>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                order.paymentStatus === 'paid' ? 'bg-[var(--mint-soft)] text-[var(--mint)]' :
                                order.paymentStatus === 'failed' ? 'bg-[var(--foil-soft)] text-[var(--ink-70)]' :
                                'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                              }`}>
                                {order.paymentStatus}
                              </span>
                            </div>
                          </div>

                          {(order.trackingNumber || order.waybill) && (
                            <div className="mt-3 text-sm">
                              <span className="text-[var(--ink-70)]">Tracking: </span>
                              <span className="data font-semibold text-[var(--ink)]">
                                {order.waybill || order.trackingNumber}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 md:w-40">
                          <Link href={`/orders/${order.orderNumber}`}>
                            <Button variant="outline" className="w-full">
                              View details
                            </Button>
                          </Link>
                          {(order.waybill || order.trackingNumber) && (
                            <Link href={`/orders/${order.orderNumber}/track`}>
                              <Button variant="outline" className="w-full">
                                Track order
                              </Button>
                            </Link>
                          )}
                          {order.paymentStatus === 'failed' && (
                            <Button className="w-full bg-[var(--ink)] text-[var(--paper-card)] hover:bg-[var(--ink-deep)]">
                              Retry payment
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-xs)]">
                    <div className="data text-sm text-[var(--ink-70)]">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={pagination.currentPage === 1}
                        onClick={() => fetchOrders(pagination.currentPage - 1)}
                        className="inline-flex items-center gap-1 px-4 py-2 border-2 border-[var(--foil)] rounded-lg text-sm font-medium text-[var(--ink-70)] hover:bg-[var(--foil-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>

                      <button
                        type="button"
                        disabled={pagination.currentPage === pagination.totalPages}
                        onClick={() => fetchOrders(pagination.currentPage + 1)}
                        className="inline-flex items-center gap-1 px-4 py-2 border-2 border-[var(--foil)] rounded-lg text-sm font-medium text-[var(--ink-70)] hover:bg-[var(--foil-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
