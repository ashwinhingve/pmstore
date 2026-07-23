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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium text-gray-900">
            ₹{orderData.subtotal.toLocaleString('en-IN')}
          </span>
        </div>

        {orderData.shippingCost > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Shipping</span>
            <span className="font-medium text-gray-900">
              ₹{orderData.shippingCost.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {orderData.discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Discount</span>
            <span className="font-medium text-green-600">
              -₹{orderData.discount.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">
              ₹{orderData.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
