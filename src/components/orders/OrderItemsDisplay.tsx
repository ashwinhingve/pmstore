import { Package } from 'lucide-react';

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  image: string;
}

interface OrderItemsDisplayProps {
  items: OrderItem[];
}

export default function OrderItemsDisplay({ items }: OrderItemsDisplayProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-amber-600" />
        Order Items ({items.length})
      </h3>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.productName}
                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-gray-900 mb-1">
                {item.productName}
              </h4>
              <p className="text-sm text-gray-600 mb-2">SKU: {item.sku}</p>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Price: </span>
                  <span className="font-medium text-gray-900">
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Qty: </span>
                  <span className="font-medium text-gray-900">×{item.quantity}</span>
                </div>
              </div>
            </div>

            {/* Item Total */}
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-gray-600 mb-1">Total</p>
              <p className="text-lg font-bold text-gray-900">
                ₹{item.total.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
