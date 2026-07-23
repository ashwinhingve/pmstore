'use client';

interface RevenueData {
  _id: string; // Date in YYYY-MM-DD format
  revenue: number;
  count: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue (Last 30 Days)</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No revenue data available
        </div>
      </div>
    );
  }

  // Find max revenue for scaling
  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const maxCount = Math.max(...data.map((d) => d.count));

  // Calculate total revenue and orders
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.count, 0);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Revenue (Last 30 Days)</h3>
        <div className="mt-2 flex items-center gap-6">
          <div>
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Orders</p>
            <p className="text-xl font-bold text-gray-900">{totalOrders}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg. Order Value</p>
            <p className="text-xl font-bold text-gray-900">
              ₹
              {totalOrders > 0
                ? (totalRevenue / totalOrders).toLocaleString('en-IN', {
                    maximumFractionDigits: 0,
                  })
                : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="relative h-64">
        <div className="absolute inset-0 flex items-end justify-between gap-1">
          {data.slice(-14).map((item, index) => {
            const heightPercentage = (item.revenue / maxRevenue) * 100;

            return (
              <div key={item._id} className="flex-1 flex flex-col items-center gap-2 group">
                {/* Bar */}
                <div className="relative w-full flex flex-col justify-end h-full">
                  <div
                    className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all hover:from-amber-700 hover:to-amber-500 cursor-pointer"
                    style={{ height: `${heightPercentage}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                        <p className="font-semibold">
                          ₹{item.revenue.toLocaleString('en-IN')}
                        </p>
                        <p className="text-gray-300">{item.count} orders</p>
                        <p className="text-gray-400">{formatDate(item._id)}</p>
                      </div>
                      <div className="w-2 h-2 bg-gray-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
                    </div>
                  </div>
                </div>

                {/* Date label */}
                <div className="text-xs text-gray-500 -rotate-45 origin-top-left mt-6">
                  {formatDate(item._id)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-t from-amber-600 to-amber-400 rounded" />
            <span>Daily Revenue</span>
          </div>
          <p className="text-gray-500">Showing last 14 days</p>
        </div>
      </div>
    </div>
  );
}
