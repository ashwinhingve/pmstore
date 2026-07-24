import { CheckCircle, Clock, Package, Truck, Home, XCircle } from 'lucide-react';

interface OrderTimelineAdminProps {
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  shipmentDate: string | null;
  lastStatusUpdate: string | null;
}

interface TimelineEvent {
  label: string;
  date: string | null;
  status: 'completed' | 'current' | 'pending';
  icon: React.ComponentType<{ className?: string }>;
}

export default function OrderTimelineAdmin({
  orderStatus,
  paymentStatus,
  createdAt,
  shipmentDate,
  lastStatusUpdate,
}: OrderTimelineAdminProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Build timeline events based on order status
  const events: TimelineEvent[] = [];

  // Order Placed (always first and completed)
  events.push({
    label: 'Order Placed',
    date: createdAt,
    status: 'completed',
    icon: CheckCircle,
  });

  // Payment Status
  if (paymentStatus === 'paid' || paymentStatus === 'success') {
    events.push({
      label: 'Payment Confirmed',
      date: createdAt,
      status: 'completed',
      icon: CheckCircle,
    });
  } else if (paymentStatus === 'failed') {
    events.push({
      label: 'Payment Failed',
      date: createdAt,
      status: 'completed',
      icon: XCircle,
    });
    return <FailedTimeline events={events} formatDate={formatDate} />;
  } else {
    events.push({
      label: 'Awaiting Payment',
      date: null,
      status: 'current',
      icon: Clock,
    });
    return <Timeline events={events} formatDate={formatDate} />;
  }

  // Order Confirmed
  if (orderStatus === 'confirmed' || orderStatus === 'processing' || orderStatus === 'shipped' || orderStatus === 'delivered') {
    events.push({
      label: 'Order Confirmed',
      date: lastStatusUpdate || createdAt,
      status: 'completed',
      icon: CheckCircle,
    });
  } else if (orderStatus === 'cancelled') {
    events.push({
      label: 'Order Cancelled',
      date: lastStatusUpdate || createdAt,
      status: 'completed',
      icon: XCircle,
    });
    return <FailedTimeline events={events} formatDate={formatDate} />;
  } else {
    events.push({
      label: 'Confirm Order',
      date: null,
      status: orderStatus === 'pending' ? 'current' : 'pending',
      icon: Clock,
    });
  }

  // Processing
  if (orderStatus === 'processing' || orderStatus === 'shipped' || orderStatus === 'delivered') {
    events.push({
      label: 'Processing',
      date: lastStatusUpdate || null,
      status: 'completed',
      icon: Package,
    });
  } else {
    events.push({
      label: 'Processing',
      date: null,
      status: orderStatus === 'processing' ? 'current' : 'pending',
      icon: Package,
    });
  }

  // Shipped
  if (orderStatus === 'shipped' || orderStatus === 'delivered') {
    events.push({
      label: 'Shipped',
      date: shipmentDate || lastStatusUpdate || null,
      status: 'completed',
      icon: Truck,
    });
  } else {
    events.push({
      label: 'Shipped',
      date: null,
      status: orderStatus === 'shipped' ? 'current' : 'pending',
      icon: Truck,
    });
  }

  // Delivered
  if (orderStatus === 'delivered') {
    events.push({
      label: 'Delivered',
      date: lastStatusUpdate || null,
      status: 'completed',
      icon: Home,
    });
  } else {
    events.push({
      label: 'Delivered',
      date: null,
      status: 'pending',
      icon: Home,
    });
  }

  return <Timeline events={events} formatDate={formatDate} />;
}

function Timeline({
  events,
  formatDate,
}: {
  events: TimelineEvent[];
  formatDate: (date: string) => string;
}) {
  return (
    <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
      <h3 className="text-lg font-semibold text-[var(--ink)] mb-6">Order Timeline</h3>

      <div className="relative">
        {events.map((event, index) => {
          const Icon = event.icon;
          const isLast = index === events.length - 1;

          return (
            <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Timeline Line */}
              {!isLast && (
                <div
                  className={`absolute left-5 top-11 w-0.5 h-full ${
                    event.status === 'completed' ? 'bg-[var(--mint)]' : 'bg-[var(--foil-soft)]'
                  }`}
                />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  event.status === 'completed'
                    ? 'bg-[var(--mint-soft)]'
                    : event.status === 'current'
                    ? 'bg-[var(--foil-soft)]'
                    : 'bg-[var(--foil-soft)]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    event.status === 'completed'
                      ? 'text-[var(--mint)]'
                      : event.status === 'current'
                      ? 'text-[var(--ink-70)]'
                      : 'text-[var(--ink-40)]'
                  }`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <p
                  className={`text-sm font-medium ${
                    event.status === 'completed'
                      ? 'text-[var(--ink)]'
                      : event.status === 'current'
                      ? 'text-[var(--ink)]'
                      : 'text-[var(--ink-40)]'
                  }`}
                >
                  {event.label}
                </p>
                {event.date && (
                  <p className="text-xs text-[var(--ink-40)] mt-1">{formatDate(event.date)}</p>
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
  events,
  formatDate,
}: {
  events: TimelineEvent[];
  formatDate: (date: string) => string;
}) {
  return (
    <div className="bg-[var(--foil-soft)] rounded-lg border border-[var(--foil-soft)] p-6">
      <h3 className="text-lg font-semibold text-[var(--ink)] mb-6">Order Timeline</h3>

      <div className="relative">
        {events.map((event, index) => {
          const Icon = event.icon;
          const isLast = index === events.length - 1;
          const isFailed = event.label.includes('Failed') || event.label.includes('Cancelled');

          return (
            <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Timeline Line */}
              {!isLast && (
                <div className="absolute left-5 top-11 w-0.5 h-full bg-[var(--foil)]" />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isFailed ? 'bg-[var(--foil-soft)]' : 'bg-[var(--mint-soft)]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isFailed ? 'text-[var(--ink)]' : 'text-[var(--mint)]'}`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <p
                  className={`text-sm font-medium ${
                    isFailed ? 'text-[var(--ink)]' : 'text-[var(--ink)]'
                  }`}
                >
                  {event.label}
                </p>
                {event.date && (
                  <p className="text-xs text-[var(--ink-70)] mt-1">{formatDate(event.date)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
