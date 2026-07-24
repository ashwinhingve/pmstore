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
      <label className="block text-sm font-medium text-[var(--ink-70)] mb-3">
        Select variant
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
                  ? 'border-[var(--ink)] bg-[var(--foil-soft)]'
                  : isOutOfStock
                  ? 'border-[var(--foil-soft)] bg-[var(--foil-soft)] cursor-not-allowed opacity-50'
                  : 'border-[var(--foil-soft)] hover:border-[var(--ink)] hover:bg-[var(--foil-soft)]'
              }`}
            >
              <p className="font-medium text-[var(--ink)]">{variant.name}</p>
              <p className="price text-sm text-[var(--ink)] font-medium mt-1" style={{ fontFamily: 'var(--font-data)' }}>
                ₹{variant.price.toLocaleString()}
              </p>
              {variant.originalPrice && variant.originalPrice > variant.price && (
                <p className="price text-xs text-[var(--ink-40)] line-through" style={{ fontFamily: 'var(--font-data)' }}>
                  ₹{variant.originalPrice.toLocaleString()}
                </p>
              )}
              {isOutOfStock && (
                <p className="text-xs text-[var(--ink-70)] mt-1">Out of stock</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
