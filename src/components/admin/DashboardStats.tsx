'use client';

import {
  ShoppingBag,
  DollarSign,
  Clock,
  Truck,
  AlertTriangle,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface StatItem {
  value: number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

interface DashboardStatsProps {
  stats: {
    totalOrders: StatItem;
    totalRevenue: StatItem;
    pendingOrders: StatItem;
    activeShipments: StatItem;
    failedPayments: StatItem;
    totalUsers: StatItem;
    totalProducts: StatItem;
    lowStockProducts: StatItem;
  };
}

const iconMap = {
  totalOrders: ShoppingBag,
  totalRevenue: DollarSign,
  pendingOrders: Clock,
  activeShipments: Truck,
  failedPayments: AlertTriangle,
  totalUsers: Users,
  totalProducts: Package,
  lowStockProducts: Package,
};

const colorMap = {
  totalOrders: 'text-[var(--ink)] bg-[var(--foil-soft)]',
  totalRevenue: 'text-[var(--brand)] bg-[var(--brand-soft)]',
  pendingOrders: 'text-[var(--ink-70)] bg-[var(--foil-soft)]',
  activeShipments: 'text-[var(--ink)] bg-[var(--foil-soft)]',
  failedPayments: 'text-[var(--ink-70)] bg-[var(--foil-soft)]',
  totalUsers: 'text-[var(--ink)] bg-[var(--foil-soft)]',
  totalProducts: 'text-[var(--ink)] bg-[var(--foil-soft)]',
  lowStockProducts: 'text-[var(--ink-70)] bg-[var(--foil-soft)]',
};

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const formatValue = (key: string, value: number) => {
    if (key === 'totalRevenue') {
      return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    return value.toLocaleString('en-IN');
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return 'text-[var(--brand)]';
    if (trend === 'down') return 'text-[var(--ink-70)]';
    return 'text-[var(--ink-70)]';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Object.entries(stats).map(([key, stat]) => {
        const Icon = iconMap[key as keyof typeof iconMap];
        const colorClass = colorMap[key as keyof typeof colorMap];

        return (
          <div
            key={key}
            className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${colorClass}`}>
                <Icon className="w-6 h-6" />
              </div>
              {stat.trend && stat.trendValue && (
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${getTrendColor(
                    stat.trend
                  )}`}
                >
                  {getTrendIcon(stat.trend)}
                  <span>{stat.trendValue}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-[length:var(--step-2)] font-bold text-[var(--ink)] mb-1 data" style={{ fontFamily: 'var(--font-data)' }}>
                {formatValue(key, stat.value)}
              </p>
              <p className="text-sm text-[var(--ink-70)]">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
