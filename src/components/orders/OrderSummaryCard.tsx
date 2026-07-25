interface OrderSummaryCardProps {
  orderData: {
    subtotal: number;
    shippingCost: number;
    tax: number;
    discount: number;
    totalAmount: number;
    orderStatus: string;
    paymentStatus: string;
  };
}

export default function OrderSummaryCard({ orderData }: OrderSummaryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-[var(--mint-soft)] text-[var(--mint)] border-[var(--mint)]';
      case 'shipped':
        return 'bg-[var(--foil-soft)] text-[var(--ink)] border-[var(--foil)]';
      case 'processing':
      case 'confirmed':
        return 'bg-[var(--foil-soft)] text-[var(--ink)] border-[var(--foil)]';
      case 'cancelled':
        return 'bg-[var(--foil-soft)] text-[var(--ink)] border-[var(--foil)]';
      default:
        return 'bg-[var(--foil-soft)] text-[var(--ink-70)] border-[var(--foil)]';
    }
  };

  return (
    <div className="bg-[var(--paper-card)] rounded-2xl shadow-[var(--shadow-sm)] p-6">
      <h3 className="text-xl font-bold text-[var(--ink)] mb-4">Order Summary</h3>

      {/* Status Badges */}
      <div className="space-y-2 mb-6">
        <div>
          <p className="text-xs text-[var(--ink-70)] mb-1">Order Status</p>
          <span
            className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg border-2 capitalize ${getStatusColor(
              orderData.orderStatus
            )}`}
          >
            {orderData.orderStatus}
          </span>
        </div>
        <div>
          <p className="text-xs text-[var(--ink-70)] mb-1">Payment Status</p>
          <span
            className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg border-2 capitalize ${
              orderData.paymentStatus === 'paid'
                ? 'bg-[var(--mint-soft)] text-[var(--mint)] border-[var(--mint)]'
                : orderData.paymentStatus === 'pending'
                ? 'bg-[var(--foil-soft)] text-[var(--ink-70)] border-[var(--foil)]'
                : 'bg-[var(--foil-soft)] text-[var(--ink)] border-[var(--foil)]'
            }`}
          >
            {orderData.paymentStatus}
          </span>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3 border-t border-[var(--foil-soft)] pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-70)]">Subtotal</span>
          <span className="font-medium text-[var(--ink)] price">
            ₹{orderData.subtotal.toLocaleString('en-IN')}
          </span>
        </div>

        {orderData.shippingCost > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-70)]">Shipping</span>
            <span className="font-medium text-[var(--ink)] price">
              ₹{orderData.shippingCost.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {orderData.discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-70)]">Discount</span>
            <span className="font-medium text-[var(--mint)] price">
              -₹{orderData.discount.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        <div className="border-t border-[var(--foil-soft)] pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[var(--ink)]">Total</span>
            <span className="text-2xl font-bold text-[var(--ink)] price">
              ₹{orderData.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
