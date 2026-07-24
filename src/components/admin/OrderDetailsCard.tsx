interface OrderDetailsCardProps {
  orderData: {
    subtotal: number;
    shippingCost: number;
    tax: number;
    discount: number;
    totalAmount: number;
  };
}

export default function OrderDetailsCard({ orderData }: OrderDetailsCardProps) {
  return (
    <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
      <h3 className="text-lg font-semibold text-[var(--ink)] mb-4">Order summary</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-70)]">Subtotal</span>
          <span className="font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
            ₹{orderData.subtotal.toLocaleString('en-IN')}
          </span>
        </div>

        {orderData.shippingCost > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-70)]">Shipping</span>
            <span className="font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
              ₹{orderData.shippingCost.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {orderData.discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-70)]">Discount</span>
            <span className="font-medium text-[var(--mint)] data" style={{ fontFamily: 'var(--font-data)' }}>
              -₹{orderData.discount.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        <div className="border-t border-[var(--foil-soft)] pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-[var(--ink)]">Total</span>
            <span className="text-lg font-bold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
              ₹{orderData.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
