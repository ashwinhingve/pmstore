'use client';

import Link from 'next/link';
import { Eye } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
}

interface RecentOrdersProps {
  orders: Order[];
}

const statusColorMap: Record<string, string> = {
  success: 'bg-[var(--mint-soft)] text-[var(--mint)]',
  paid: 'bg-[var(--mint-soft)] text-[var(--mint)]',
  pending: 'bg-[var(--foil-soft)] text-[var(--ink-70)]',
  failed: 'bg-[var(--foil-soft)] text-[var(--ink)]',
  confirmed: 'bg-[var(--foil-soft)] text-[var(--ink)]',
  processing: 'bg-[var(--foil-soft)] text-[var(--ink-70)]',
  shipped: 'bg-[var(--foil-soft)] text-[var(--ink)]',
  delivered: 'bg-[var(--mint-soft)] text-[var(--mint)]',
  cancelled: 'bg-[var(--foil-soft)] text-[var(--ink)]',
};

export default function RecentOrders({ orders }: RecentOrdersProps) {
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
    <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)]">
      <div className="p-6 border-b border-[var(--foil-soft)] flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--ink)]">Recent orders</h3>
          <p className="text-sm text-[var(--ink-70)] mt-1">Latest orders from your store</p>
        </div>
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
        >
          View all →
        </Link>
      </div>

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
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-[var(--ink-70)]">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-[var(--foil-soft)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                      {order.orderNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[var(--ink)]">{order.customerName}</div>
                    <div className="text-xs text-[var(--ink-70)]">{order.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        statusColorMap[order.paymentStatus] || 'bg-[var(--foil-soft)] text-[var(--ink)]'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        statusColorMap[order.orderStatus] || 'bg-[var(--foil-soft)] text-[var(--ink)]'
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
    </div>
  );
}
