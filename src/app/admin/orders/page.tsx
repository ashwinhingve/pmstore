import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import OrdersTable from '@/components/admin/OrdersTable';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Ensure user is admin
  await requireAdmin();

  // Connect to database
  await connectDB();

  const params = await searchParams;

  // Parse query parameters
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const search = params.search || '';
  const status = params.status || '';
  const paymentStatus = params.paymentStatus || '';
  const dateFrom = params.dateFrom || '';
  const dateTo = params.dateTo || '';
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder || 'desc';

  // Build query
  const query: any = {};

  // Search by order number or customer email
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'shippingAddress.email': { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by order status
  if (status) {
    query.orderStatus = status;
  }

  // Filter by payment status
  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  // Filter by date range
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) {
      query.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  // Build sort
  const sort: any = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Fetch orders with pagination
  const [orders, totalOrders] = await Promise.all([
    Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .lean(),
    Order.countDocuments(query),
  ]);

  // Calculate pagination
  const totalPages = Math.ceil(totalOrders / limit);

  // Transform orders for client component
  const ordersData = orders.map((order: any) => ({
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    customerName: order.userId?.name || order.shippingAddress?.name || 'Guest',
    customerEmail: order.userId?.email || order.shippingAddress?.email || 'N/A',
    itemsCount: order.items?.length || 0,
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt.toISOString(),
    waybill: order.waybill || null,
  }));

  // Get status counts for filters
  const statusCounts = await Order.aggregate([
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  const paymentStatusCounts = await Order.aggregate([
    {
      $group: {
        _id: '$paymentStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Order management"
        description={<>Manage all orders from your store (<span style={{ fontFamily: 'var(--font-data)' }}>{totalOrders.toLocaleString()}</span> total)</>}
      />

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          className={`p-4 rounded-lg border-2 text-left ${
            !status
              ? 'border-[var(--ink)] bg-[var(--foil-soft)]'
              : 'border-[var(--foil-soft)] bg-[var(--paper-card)]'
          }`}
        >
          <p className="text-xs text-[var(--ink-70)] uppercase tracking-wide">All orders</p>
          <p className="text-2xl font-bold text-[var(--ink)] mt-1 data" style={{ fontFamily: 'var(--font-data)' }}>{totalOrders}</p>
        </div>

        {statusCounts.map((item) => (
          <div
            key={item._id}
            className={`p-4 rounded-lg border-2 text-left ${
              status === item._id
                ? 'border-[var(--ink)] bg-[var(--foil-soft)]'
                : 'border-[var(--foil-soft)] bg-[var(--paper-card)]'
            }`}
          >
            <p className="text-xs text-[var(--ink-70)] uppercase tracking-wide capitalize">
              {item._id}
            </p>
            <p className="text-2xl font-bold text-[var(--ink)] mt-1 data" style={{ fontFamily: 'var(--font-data)' }}>{item.count}</p>
          </div>
        ))}
      </div>

      {/* Orders Table with Filters */}
      <OrdersTable
        orders={ordersData}
        totalPages={totalPages}
        currentPage={page}
        filters={{
          search,
          status,
          paymentStatus,
          dateFrom,
          dateTo,
          sortBy,
          sortOrder,
        }}
        statusCounts={statusCounts}
        paymentStatusCounts={paymentStatusCounts}
      />
    </div>
  );
}
