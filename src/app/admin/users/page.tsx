import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import UsersTable from '@/components/admin/UsersTable';

interface SearchParams {
  page?: string;
  search?: string;
  role?: string;
  sortBy?: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Ensure user is admin
  await requireAdmin();

  // Connect to database
  await connectDB();

  // Await searchParams
  const params = await searchParams;

  // Parse query parameters
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const search = params.search || '';
  const role = params.role || '';
  const sortBy = params.sortBy || 'createdAt';

  // Build query
  const query: any = {};

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Build sort
  const sort: any = {};
  if (sortBy === 'orders') {
    sort.orderCount = -1;
  } else if (sortBy === 'spent') {
    sort.totalSpent = -1;
  } else {
    sort[sortBy] = -1;
  }

  // Fetch users with pagination
  const [users, totalUsers] = await Promise.all([
    User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  // Calculate pagination
  const totalPages = Math.ceil(totalUsers / limit);

  // Fetch order statistics for each user
  const usersWithStats = await Promise.all(
    users.map(async (user: any) => {
      const [orderCount, orderStats] = await Promise.all([
        Order.countDocuments({ userId: user._id }),
        Order.aggregate([
          {
            $match: {
              userId: user._id,
              paymentStatus: 'paid',
            },
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: '$totalAmount' },
            },
          },
        ]),
      ]);

      return {
        id: user._id.toString(),
        name: user.name || 'N/A',
        email: user.email,
        role: user.role || 'client',
        image: user.image || null,
        orderCount,
        totalSpent: orderStats[0]?.totalSpent || 0,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        lastLogin: user.lastLogin?.toISOString() || null,
      };
    })
  );

  // Get role counts
  const [totalClients, totalAdmins] = await Promise.all([
    User.countDocuments({ role: 'client' }),
    User.countDocuments({ role: 'admin' }),
  ]);

  // Get recent signups (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSignups = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)]">User management</h1>
          <p className="text-sm text-[var(--ink-70)] mt-1">
            Manage all users and their permissions ({totalUsers.toLocaleString()} total)
          </p>
        </div>

        {/* Export Button */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--paper-card)] border border-[var(--foil-soft)] rounded-lg text-sm font-medium text-[var(--ink)] hover:bg-[var(--foil-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export CSV
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--ink-70)]">Total users</p>
            <div className="p-2 bg-[var(--foil-soft)] rounded-lg">
              <svg
                className="w-5 h-5 text-[var(--ink)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>{totalUsers}</p>
        </div>

        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--ink-70)]">Clients</p>
            <div className="p-2 bg-[var(--mint-soft)] rounded-lg">
              <svg
                className="w-5 h-5 text-[var(--mint)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--mint)] data" style={{ fontFamily: 'var(--font-data)' }}>{totalClients}</p>
        </div>

        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--ink-70)]">Admins</p>
            <div className="p-2 bg-[var(--foil-soft)] rounded-lg">
              <svg
                className="w-5 h-5 text-[var(--ink)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>{totalAdmins}</p>
        </div>

        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--ink-70)]">New (30 days)</p>
            <div className="p-2 bg-[var(--mint-soft)] rounded-lg">
              <svg
                className="w-5 h-5 text-[var(--mint)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--mint)] data" style={{ fontFamily: 'var(--font-data)' }}>{recentSignups}</p>
        </div>
      </div>

      {/* Users Table */}
      <UsersTable
        users={usersWithStats}
        totalPages={totalPages}
        currentPage={page}
        filters={{
          search,
          role,
          sortBy,
        }}
      />
    </div>
  );
}
