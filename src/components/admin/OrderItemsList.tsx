interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  image: string;
}

interface OrderItemsListProps {
  items: OrderItem[];
}

export default function OrderItemsList({ items }: OrderItemsListProps) {
  return (
    <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)]">
      <div className="p-6 border-b border-[var(--foil-soft)]">
        <h3 className="text-lg font-semibold text-[var(--ink)]">Order Items</h3>
        <p className="text-sm text-[var(--ink-40)] mt-1">{items.length} item(s)</p>
      </div>

      <div className="divide-y divide-[var(--foil-soft)]">
        {items.map((item, index) => (
          <div key={index} className="p-6 flex items-start gap-4">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.productName}
                  className="w-20 h-20 object-cover rounded-lg border border-[var(--foil-soft)]"
                />
              ) : (
                <div className="w-20 h-20 bg-[var(--foil-soft)] rounded-lg border border-[var(--foil-soft)] flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-[var(--ink-40)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-[var(--ink)]">{item.productName}</h4>
              <p className="text-sm text-[var(--ink-40)] mt-1">SKU: {item.sku}</p>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <p className="text-xs text-[var(--ink-40)]">Price</p>
                  <p className="text-sm font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--font-data)' }}>
                    ₹{item.price.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--ink-40)]">Quantity</p>
                  <p className="text-sm font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--font-data)' }}>×{item.quantity}</p>
                </div>
              </div>
            </div>

            {/* Item Total */}
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-[var(--ink-40)]">Total</p>
              <p className="text-base font-semibold text-[var(--ink)]" style={{ fontFamily: 'var(--font-data)' }}>
                ₹{item.total.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
