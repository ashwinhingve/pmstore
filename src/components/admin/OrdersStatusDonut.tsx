'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface StatusCount {
  _id: string;
  count: number;
}

const STATUS_COLOR: Record<string, string> = {
  delivered: 'var(--mint)',
  shipped: 'var(--ink)',
  confirmed: 'var(--ink-70)',
  processing: 'var(--ink-70)',
  pending: 'var(--foil)',
  cancelled: 'var(--ink-40)',
  refunded: 'var(--ink-40)',
};

function colorFor(status: string) {
  return STATUS_COLOR[status] ?? 'var(--foil)';
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: StatusCount }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--ink)] px-3 py-2 text-xs text-[var(--paper-card)] shadow-[var(--shadow-md)]">
      <p className="font-semibold capitalize">{d._id}</p>
      <p className="data mt-0.5 opacity-80">
        {d.count} {d.count === 1 ? 'order' : 'orders'}
      </p>
    </div>
  );
}

export default function OrdersStatusDonut({ data }: { data: StatusCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-xs)]">
        <h3 className="mb-4 text-lg font-semibold text-[var(--ink)]">Orders by status</h3>
        <div className="flex h-64 items-center justify-center text-[var(--ink-70)]">
          No orders yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-xs)]">
      <h3 className="mb-4 text-lg font-semibold text-[var(--ink)]">Orders by status</h3>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative h-52 w-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="_id"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry._id} fill={colorFor(entry._id)} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="data text-2xl font-bold text-[var(--ink)]">{total}</span>
            <span className="text-xs text-[var(--ink-70)]">orders</span>
          </div>
        </div>

        <ul className="w-full space-y-2.5">
          {[...data]
            .sort((a, b) => b.count - a.count)
            .map((status) => (
              <li key={status._id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: colorFor(status._id) }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium capitalize text-[var(--ink-70)]">
                    {status._id}
                  </span>
                </span>
                <span className="data text-sm font-semibold text-[var(--ink)]">
                  {status.count}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
