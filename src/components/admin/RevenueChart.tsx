'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RevenueData {
  _id: string; // Date in YYYY-MM-DD format
  revenue: number;
  count: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(
    new Date(dateString)
  );

const formatINRShort = (value: number) =>
  value >= 1000 ? `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : `₹${value}`;

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RevenueData }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--ink)] px-3 py-2 text-xs text-[var(--paper-card)] shadow-[var(--shadow-md)]">
      <p className="data font-semibold">₹{d.revenue.toLocaleString('en-IN')}</p>
      <p className="data mt-0.5 opacity-80">
        {d.count} {d.count === 1 ? 'order' : 'orders'}
      </p>
      <p className="mt-0.5 opacity-80">{formatDate(d._id)}</p>
    </div>
  );
}

export default function RevenueChart({ data }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-xs)]">
        <h3 className="mb-4 text-lg font-semibold text-[var(--ink)]">Revenue (last 30 days)</h3>
        <div className="flex h-64 items-center justify-center text-[var(--ink-70)]">
          No revenue data yet
        </div>
      </div>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.count, 0);

  const stats = [
    {
      label: 'Total revenue',
      value: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    },
    { label: 'Total orders', value: String(totalOrders) },
    {
      label: 'Average order value',
      value: `₹${
        totalOrders > 0
          ? (totalRevenue / totalOrders).toLocaleString('en-IN', { maximumFractionDigits: 0 })
          : 0
      }`,
    },
  ];

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-xs)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--ink)]">Revenue (last 30 days)</h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-xs text-[var(--ink-70)]">{s.label}</p>
              <p className="data text-xl font-bold text-[var(--ink)]">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--mint)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--mint)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--foil-soft)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="_id"
              tickFormatter={formatDate}
              tick={{ fill: 'var(--ink-40)', fontSize: 11, fontFamily: 'var(--font-data)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--foil)' }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={formatINRShort}
              tick={{ fill: 'var(--ink-40)', fontSize: 11, fontFamily: 'var(--font-data)' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'var(--foil)' }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--mint)"
              strokeWidth={2}
              fill="url(#revenueFill)"
              activeDot={{ r: 4, fill: 'var(--mint)', stroke: 'var(--paper-card)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
