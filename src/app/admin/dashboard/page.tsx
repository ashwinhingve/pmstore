import Link from 'next/link';
import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import Shipment from '@/models/Shipment';
import Product from '@/models/Product';
import DashboardStats from '@/components/admin/DashboardStats';
import RecentOrders from '@/components/admin/RecentOrders';
import RevenueChart from '@/components/admin/RevenueChart';
import OrdersStatusDonut from '@/components/admin/OrdersStatusDonut';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card } from '@/components/ui/card';
import { Clock, CreditCard, PackageX, Activity } from 'lucide-react';

/**
 * Admin Dashboard Overview
 * Shows key metrics, charts, and recent activity
 */
export default async function AdminDashboard() {
  // Ensure user is admin (will redirect if not)
  await requireAdmin();

  // Connect to database
  await connectDB();

  // Calculate date ranges
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch dashboard statistics in parallel
  const [
    totalOrdersThisMonth,
    totalRevenueThisMonth,
    pendingOrders,
    activeShipments,
    failedPayments,
    totalUsers,
    totalProducts,
    recentOrders,
  ] = await Promise.all([
    // Total orders this month
    Order.countDocuments({
      createdAt: { $gte: startOfMonth },
    }),

    // Total revenue this month (only paid orders)
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]).then((result) => result[0]?.total || 0),

    // Pending orders (paid but not yet shipped)
    Order.countDocuments({
      paymentStatus: 'paid',
      orderStatus: { $in: ['confirmed', 'processing'] },
    }),

    // Active shipments (in transit or out for delivery)
    Shipment.countDocuments({
      shipmentStatus: { $in: ['In Transit', 'Out for Delivery', 'Dispatched', 'Pending', 'Manifested'] },
    }),

    // Failed payments (last 7 days)
    Transaction.countDocuments({
      status: 'failed',
      createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    }),

    // Total users
    User.countDocuments(),

    // Total products
    Product.countDocuments(),

    // Recent orders (last 10)
    Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email')
      .lean()
      .then((orders) =>
        orders.map((order: any) => ({
          id: order._id.toString(),
          orderNumber: order.orderNumber,
          customerName: order.userId?.name || 'Guest',
          customerEmail: order.userId?.email || 'N/A',
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          createdAt: order.createdAt.toISOString(),
        }))
      ),
  ]);

  // Fetch revenue data for last 30 days
  const revenueByDay = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
        paymentStatus: 'paid',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        revenue: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Fetch orders by status for pie chart
  const ordersByStatus = await Order.aggregate([
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  // Calculate low stock products
  const lowStockCount = await Product.countDocuments({
    stock: { $lt: 10 },
  });

  // Prepare stats data
  const stats = {
    totalOrders: {
      value: totalOrdersThisMonth,
      label: 'Orders This Month',
      trend: 'up' as const,
      trendValue: '12%',
    },
    totalRevenue: {
      value: totalRevenueThisMonth,
      label: 'Revenue This Month',
      trend: 'up' as const,
      trendValue: '8%',
    },
    pendingOrders: {
      value: pendingOrders,
      label: 'Pending Orders',
      trend: 'neutral' as const,
    },
    activeShipments: {
      value: activeShipments,
      label: 'Active Shipments',
      trend: 'neutral' as const,
    },
    failedPayments: {
      value: failedPayments,
      label: 'Failed Payments (7d)',
      trend: (failedPayments > 0 ? 'down' : 'neutral') as 'down' | 'neutral',
    },
    totalUsers: {
      value: totalUsers,
      label: 'Total Users',
      trend: 'up' as const,
      trendValue: '5%',
    },
    totalProducts: {
      value: totalProducts,
      label: 'Total Products',
      trend: 'neutral' as const,
    },
    lowStockProducts: {
      value: lowStockCount,
      label: 'Low Stock Alert',
      trend: (lowStockCount > 0 ? 'down' : 'neutral') as 'down' | 'neutral',
    },
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard overview"
        description="Here's what's happening with your store today."
      />

      {/* Stats Grid */}
      <DashboardStats stats={stats} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <RevenueChart data={revenueByDay} />

        {/* Orders by Status */}
        <OrdersStatusDonut
          data={ordersByStatus.map((s) => ({ _id: String(s._id), count: s.count }))}
        />
      </div>

      {/* Recent Orders */}
      <RecentOrders orders={recentOrders} />

      {/* Quick Actions */}
      <Card variant="elevated" padding="lg">
        <h2 className="mb-4 text-[length:var(--step-1)] font-bold text-[var(--ink)]">Quick actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: '/admin/orders?status=pending',
              icon: Clock,
              title: 'Process pending orders',
              meta: `${pendingOrders} orders waiting`,
            },
            {
              href: '/admin/payments?status=failed',
              icon: CreditCard,
              title: 'Review failed payments',
              meta: `${failedPayments} failed transactions`,
            },
            {
              href: '/admin/products?filter=low-stock',
              icon: PackageX,
              title: 'Low stock alerts',
              meta: `${lowStockCount} products low`,
            },
            {
              href: '/admin/system',
              icon: Activity,
              title: 'System health',
              meta: 'Check status',
            },
          ].map(({ href, icon: Icon, title, meta }) => (
            <Link
              key={title}
              href={href}
              className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper)] p-4 shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--mint-soft)] text-[var(--mint)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
                <p
                  className="mt-0.5 text-xs text-[var(--ink-70)]"
                  style={{ fontFamily: 'var(--font-data)' }}
                >
                  {meta}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
