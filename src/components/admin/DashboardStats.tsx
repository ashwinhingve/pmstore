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
  totalOrders: 'text-blue-600 bg-blue-100',
  totalRevenue: 'text-green-600 bg-green-100',
  pendingOrders: 'text-yellow-600 bg-yellow-100',
  activeShipments: 'text-purple-600 bg-purple-100',
  failedPayments: 'text-red-600 bg-red-100',
  totalUsers: 'text-indigo-600 bg-indigo-100',
  totalProducts: 'text-amber-600 bg-amber-100',
  lowStockProducts: 'text-orange-600 bg-orange-100',
};

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const formatValue = (key: string, value: number) => {
    if (key === 'totalRevenue') {
      return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    return value.toLocaleString();
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Object.entries(stats).map(([key, stat]) => {
        const Icon = iconMap[key as keyof typeof iconMap];
        const colorClass = colorMap[key as keyof typeof colorMap];

        return (
          <div
            key={key}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
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
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {formatValue(key, stat.value)}
              </p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
