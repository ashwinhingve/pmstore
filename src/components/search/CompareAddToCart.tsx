'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { useGatedAddToCart } from '@/hooks/useGatedAddToCart';
import { toast } from '@/store/useToastStore';

/** The fields the cart needs to add a brand from a comparison pane. */
export interface CompareCartProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  packSize: number;
  packUnit: string;
  unitPrice: number;
  mrp?: number;
  prescriptionRequired: boolean;
  stock: number;
}

/**
 * Compact "Add to cart" for a comparison pane in SearchComparison. Keeps the
 * server-rendered card static and adds just this interactive island. Builds the
 * minimal product shape useCartStore.normalizeProduct expects (it reads
 * `_id || id`, name, slug, price, images, unitPrice, packSize/packUnit, mrp).
 */
export function CompareAddToCart({ product }: { product: CompareCartProduct }) {
  const [added, setAdded] = useState(false);
  const { addToCart, gateModal } = useGatedAddToCart();
  const outOfStock = product.stock <= 0;

  const handleAdd = () => {
    addToCart(
      {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        originalPrice: product.mrp,
        images: product.image ? [{ url: product.image }] : [],
        category: '',
        prescriptionRequired: product.prescriptionRequired,
        packSize: product.packSize,
        packUnit: product.packUnit,
        unitPrice: product.unitPrice,
        mrp: product.mrp,
      },
      1,
      () => {
        toast.success(`${product.name} added to cart`);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      },
    );
  };

  return (
    <>
    {gateModal}
    <button
      type="button"
      onClick={handleAdd}
      disabled={outOfStock}
      className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--brand)] text-xs font-semibold text-[var(--brand-ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:bg-[var(--foil-soft)] disabled:text-[var(--ink-40)]"
    >
      {outOfStock ? (
        'Out of stock'
      ) : added ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Added
        </>
      ) : (
        <>
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" /> Add to cart
        </>
      )}
    </button>
    </>
  );
}
