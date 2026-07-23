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
        return 'bg-green-100 text-green-700 border-green-300';
      case 'shipped':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'processing':
      case 'confirmed':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h3>

      {/* Status Badges */}
      <div className="space-y-2 mb-6">
        <div>
          <p className="text-xs text-gray-600 mb-1">Order Status</p>
          <span
            className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg border-2 capitalize ${getStatusColor(
              orderData.orderStatus
            )}`}
          >
            {orderData.orderStatus}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Payment Status</p>
          <span
            className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg border-2 capitalize ${
              orderData.paymentStatus === 'paid'
                ? 'bg-green-100 text-green-700 border-green-300'
                : orderData.paymentStatus === 'pending'
                ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                : 'bg-red-100 text-red-700 border-red-300'
            }`}
          >
            {orderData.paymentStatus}
          </span>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
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
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
              ₹{orderData.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
