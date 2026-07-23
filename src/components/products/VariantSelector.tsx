'use client';

interface Variant {
  id: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
  stock: number;
  isActive: boolean;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariant: Variant | null;
  onSelectVariant: (variant: Variant | null) => void;
}

export default function VariantSelector({
  variants,
  selectedVariant,
  onSelectVariant,
}: VariantSelectorProps) {
  const activeVariants = variants.filter((v) => v.isActive);

  if (activeVariants.length === 0) {
    return null;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Select Variant
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {activeVariants.map((variant) => {
          const isSelected = selectedVariant?.id === variant.id;
          const isOutOfStock = variant.stock === 0;

          return (
            <button
              key={variant.id}
              onClick={() => onSelectVariant(isSelected ? null : variant)}
              disabled={isOutOfStock}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-amber-600 bg-amber-50'
                  : isOutOfStock
                  ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                  : 'border-gray-200 hover:border-amber-400 hover:bg-amber-50'
              }`}
            >
              <p className="font-medium text-gray-900">{variant.name}</p>
              <p className="text-sm text-amber-600 font-medium mt-1">
                ₹{variant.price.toLocaleString()}
              </p>
              {variant.originalPrice && variant.originalPrice > variant.price && (
                <p className="text-xs text-gray-400 line-through">
                  ₹{variant.originalPrice.toLocaleString()}
                </p>
              )}
              {isOutOfStock && (
                <p className="text-xs text-red-600 mt-1">Out of stock</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
