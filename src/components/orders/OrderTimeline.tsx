import { CheckCircle, Clock, Package, Truck, Home, XCircle } from 'lucide-react';

interface OrderTimelineProps {
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  shipmentDate: string | null;
  estimatedDelivery: string | null;
}

interface TimelineStep {
  label: string;
  date: string | null;
  status: 'completed' | 'current' | 'upcoming';
  icon: React.ComponentType<{ className?: string }>;
}

export default function OrderTimeline({
  orderStatus,
  paymentStatus,
  createdAt,
  shipmentDate,
  estimatedDelivery,
}: OrderTimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Build timeline steps
  const steps: TimelineStep[] = [];

  // Order Placed
  steps.push({
    label: 'Order Placed',
    date: createdAt,
    status: 'completed',
    icon: CheckCircle,
  });

  // Payment Status
  if (paymentStatus === 'paid' || paymentStatus === 'success') {
    steps.push({
      label: 'Payment Confirmed',
      date: createdAt,
      status: 'completed',
      icon: CheckCircle,
    });
  } else if (paymentStatus === 'failed') {
    return <FailedTimeline createdAt={createdAt} formatDate={formatDate} />;
  } else {
    steps.push({
      label: 'Awaiting Payment',
      date: null,
      status: 'current',
      icon: Clock,
    });
    return <Timeline steps={steps} formatDate={formatDate} />;
  }

  // Order Confirmed
  if (['confirmed', 'processing', 'shipped', 'delivered'].includes(orderStatus)) {
    steps.push({
      label: 'Order Confirmed',
      date: createdAt,
      status: 'completed',
      icon: CheckCircle,
    });
  } else if (orderStatus === 'cancelled') {
    steps.push({
      label: 'Order Cancelled',
      date: createdAt,
      status: 'completed',
      icon: XCircle,
    });
    return <FailedTimeline createdAt={createdAt} formatDate={formatDate} />;
  } else {
    steps.push({
      label: 'Confirming Order',
      date: null,
      status: 'current',
      icon: Clock,
    });
    return <Timeline steps={steps} formatDate={formatDate} />;
  }

  // Processing
  if (['processing', 'shipped', 'delivered'].includes(orderStatus)) {
    steps.push({
      label: 'Processing',
      date: null,
      status: 'completed',
      icon: Package,
    });
  } else {
    steps.push({
      label: 'Processing',
      date: null,
      status: orderStatus === 'processing' ? 'current' : 'upcoming',
      icon: Package,
    });
  }

  // Shipped
  if (['shipped', 'delivered'].includes(orderStatus)) {
    steps.push({
      label: 'Shipped',
      date: shipmentDate,
      status: 'completed',
      icon: Truck,
    });
  } else {
    steps.push({
      label: 'Shipped',
      date: estimatedDelivery ? `Est. ${formatDate(estimatedDelivery)}` : null,
      status: orderStatus === 'shipped' ? 'current' : 'upcoming',
      icon: Truck,
    });
  }

  // Delivered
  if (orderStatus === 'delivered') {
    steps.push({
      label: 'Delivered',
      date: null,
      status: 'completed',
      icon: Home,
    });
  } else {
    steps.push({
      label: 'Delivered',
      date: estimatedDelivery ? `Est. ${formatDate(estimatedDelivery)}` : null,
      status: 'upcoming',
      icon: Home,
    });
  }

  return <Timeline steps={steps} formatDate={formatDate} />;
}

function Timeline({
  steps,
  formatDate,
}: {
  steps: TimelineStep[];
  formatDate: (date: string) => string;
}) {
  return (
    <div className="bg-[var(--paper-card)] rounded-2xl shadow-[var(--shadow-sm)] p-6">
      <h3 className="text-xl font-bold text-[var(--ink)] mb-6">Order Status</h3>

      <div className="relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Timeline Line */}
              {!isLast && (
                <div
                  className={`absolute left-5 top-12 w-0.5 h-full ${
                    step.status === 'completed' ? 'bg-[var(--mint)]' : 'bg-[var(--foil-soft)]'
                  }`}
                />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  step.status === 'completed'
                    ? 'bg-[var(--mint-soft)]'
                    : step.status === 'current'
                    ? 'bg-[var(--foil-soft)]'
                    : 'bg-[var(--foil-soft)]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    step.status === 'completed'
                      ? 'text-[var(--mint)]'
                      : step.status === 'current'
                      ? 'text-[var(--ink)]'
                      : 'text-[var(--ink-40)]'
                  }`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <p
                  className={`text-base font-medium ${
                    step.status === 'completed'
                      ? 'text-[var(--ink)]'
                      : step.status === 'current'
                      ? 'text-[var(--ink)]'
                      : 'text-[var(--ink-40)]'
                  }`}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-sm text-[var(--ink-70)] mt-1 pack">
                    {typeof step.date === 'string' && step.date.startsWith('Est.')
                      ? step.date
                      : formatDate(step.date)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FailedTimeline({
  createdAt,
  formatDate,
}: {
  createdAt: string;
  formatDate: (date: string) => string;
}) {
  return (
    <div className="bg-[var(--foil-soft)] rounded-2xl border-2 border-[var(--foil)] shadow-[var(--shadow-sm)] p-6">
      <h3 className="text-xl font-bold text-[var(--ink)] mb-6">Order Status</h3>

      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--mint-soft)] flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[var(--mint)]" />
          </div>
          <div>
            <p className="text-base font-medium text-[var(--ink)]">Order Placed</p>
            <p className="text-sm text-[var(--ink-70)] mt-1 pack">{formatDate(createdAt)}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--foil-soft)] flex items-center justify-center">
            <XCircle className="w-5 h-5 text-[var(--ink)]" />
          </div>
          <div>
            <p className="text-base font-medium text-[var(--ink)]">Payment Failed / Order Cancelled</p>
            <p className="text-sm text-[var(--ink-70)] mt-1">Please contact support for assistance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
