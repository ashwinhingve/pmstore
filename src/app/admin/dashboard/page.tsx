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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)]">Dashboard overview</h1>
        <p className="text-sm text-[var(--ink-70)] mt-1">
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Stats Grid */}
      <DashboardStats stats={stats} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <RevenueChart data={revenueByDay} />

        {/* Orders by Status */}
        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
          <h3 className="text-lg font-semibold text-[var(--ink)] mb-4">Orders by status</h3>
          <div className="space-y-3">
            {ordersByStatus.map((status) => (
              <div key={status._id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      status._id === 'confirmed' || status._id === 'processing'
                        ? 'bg-[var(--ink)]'
                        : status._id === 'shipped'
                        ? 'bg-[var(--mint)]'
                        : status._id === 'delivered'
                        ? 'bg-[var(--mint)]'
                        : status._id === 'cancelled'
                        ? 'bg-[var(--ink-70)]'
                        : 'bg-[var(--foil)]'
                    }`}
                  />
                  <span className="text-sm font-medium text-[var(--ink-70)] capitalize">
                    {status._id}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>{status.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <RecentOrders orders={recentOrders} />

      {/* Quick Actions */}
      <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
        <h3 className="text-lg font-semibold text-[var(--ink)] mb-4">Quick actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/orders?status=pending"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-[var(--foil-soft)] hover:border-[var(--ink)] hover:bg-[var(--foil-soft)] transition-all"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--ink)]">Process pending orders</p>
              <p className="text-xs text-[var(--ink-70)] mt-1" style={{ fontFamily: 'var(--font-data)' }}>{pendingOrders} orders waiting</p>
            </div>
          </a>

          <a
            href="/admin/payments?status=failed"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-[var(--foil-soft)] hover:border-[var(--ink)] hover:bg-[var(--foil-soft)] transition-all"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--ink)]">Review failed payments</p>
              <p className="text-xs text-[var(--ink-70)] mt-1" style={{ fontFamily: 'var(--font-data)' }}>{failedPayments} failed transactions</p>
            </div>
          </a>

          <a
            href="/admin/products?filter=low-stock"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-[var(--foil-soft)] hover:border-[var(--ink)] hover:bg-[var(--foil-soft)] transition-all"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--ink)]">Low stock alerts</p>
              <p className="text-xs text-[var(--ink-70)] mt-1" style={{ fontFamily: 'var(--font-data)' }}>{lowStockCount} products low</p>
            </div>
          </a>

          <a
            href="/admin/system"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-[var(--foil-soft)] hover:border-[var(--ink)] hover:bg-[var(--foil-soft)] transition-all"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--ink)]">System health</p>
              <p className="text-xs text-[var(--ink-70)] mt-1">Check status</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
