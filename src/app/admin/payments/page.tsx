import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Order from '@/models/Order';
import PaymentsTable from '@/components/admin/PaymentsTable';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: string;
  amountMax?: string;
}

export default async function AdminPaymentsPage({
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
  const paymentMethod = params.paymentMethod || '';
  const dateFrom = params.dateFrom || '';
  const dateTo = params.dateTo || '';
  const amountMin = params.amountMin || '';
  const amountMax = params.amountMax || '';

  // Build query
  const query: any = {};

  // Search by transaction ID or order number
  if (search) {
    query.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { orderNumber: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by payment method
  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
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

  // Filter by amount range
  if (amountMin || amountMax) {
    query.amount = {};
    if (amountMin) {
      query.amount.$gte = parseFloat(amountMin);
    }
    if (amountMax) {
      query.amount.$lte = parseFloat(amountMax);
    }
  }

  // Fetch transactions with pagination
  const [transactions, totalTransactions] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('orderId', 'orderNumber userId')
      .lean(),
    Transaction.countDocuments(query),
  ]);

  // Calculate pagination
  const totalPages = Math.ceil(totalTransactions / limit);

  // Transform transactions for client component
  const transactionsData = await Promise.all(
    transactions.map(async (txn: any) => {
      let customerName = 'N/A';
      let customerEmail = 'N/A';

      if (txn.orderId) {
        const order = await Order.findById(txn.orderId)
          .populate('userId', 'name email')
          .lean() as any;

        if (order) {
          customerName = order.userId?.name || order.shippingAddress?.name || 'Guest';
          customerEmail =
            order.userId?.email || order.shippingAddress?.email || 'N/A';
        }
      }

      return {
        id: txn._id.toString(),
        transactionId: txn.transactionId || txn.gatewayOrderId,
        orderNumber: txn.orderId?.orderNumber || txn.gatewayOrderId,
        customerName,
        customerEmail,
        amount: txn.amount,
        paymentMethod: txn.paymentMethod || 'N/A',
        status: txn.status,
        bankTransactionId: txn.bankTransactionId || null,
        failureReason: txn.failureReason || null,
        createdAt: txn.createdAt.toISOString(),
        orderId: txn.orderId?._id?.toString() || (typeof txn.orderId === 'string' ? txn.orderId : null),
      };
    })
  );

  // Get statistics
  const [statusCounts, paymentMethodCounts, totalRevenue, failedAmount] =
    await Promise.all([
      Transaction.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: { status: 'success' },
        },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: { status: 'success' },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]).then((result) => result[0]?.total || 0),
      Transaction.aggregate([
        {
          $match: { status: 'failed' },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]).then((result) => result[0]?.total || 0),
    ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all payment transactions ({totalTransactions.toLocaleString()}{' '}
            total)
          </p>
        </div>

        {/* Export placeholder */}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">Successful payments</p>
        </div>

        {statusCounts.map((item) => (
          <div
            key={item._id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 capitalize">{item._id} Payments</p>
              <div
                className={`p-2 rounded-lg ${
                  item._id === 'success'
                    ? 'bg-green-100'
                    : item._id === 'pending'
                    ? 'bg-yellow-100'
                    : item._id === 'refunded'
                    ? 'bg-purple-100'
                    : 'bg-red-100'
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    item._id === 'success'
                      ? 'text-green-600'
                      : item._id === 'pending'
                      ? 'text-yellow-600'
                      : item._id === 'refunded'
                      ? 'text-purple-600'
                      : 'text-red-600'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{item.count}</p>
          </div>
        ))}

        {failedAmount > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Failed Amount</p>
              <div className="p-2 bg-red-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">
              ₹{failedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Potential lost revenue</p>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <PaymentsTable
        transactions={transactionsData}
        totalPages={totalPages}
        currentPage={page}
        filters={{
          search,
          status,
          paymentMethod,
          dateFrom,
          dateTo,
          amountMin,
          amountMax,
        }}
        statusCounts={statusCounts}
        paymentMethodCounts={paymentMethodCounts}
      />
    </div>
  );
}
