'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGatedAddToCart } from '@/hooks/useGatedAddToCart';
import { toast } from '@/store/useToastStore';
import type { CompareProduct } from '@/lib/pharma/compare';

/**
 * Client island under the compare verdict. The page stays a Server Component;
 * only this button needs the cart store.
 */
export function AddBestToCartButton({ product }: { product: CompareProduct }) {
  const { addToCart, gateModal } = useGatedAddToCart();
  const [added, setAdded] = useState(false);

  return (
    <>
      {gateModal}
      <Button
        size="sm"
        onClick={() => {
          addToCart({ ...product, images: [], category: '' }, 1, () => {
            toast.success(`${product.name} added to cart`);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          });
        }}
        disabled={added}
        className="h-11 bg-[var(--brand)] px-5 text-sm font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-deep)]"
      >
        {added ? 'Added to cart' : `Add ${product.name} to cart`}
      </Button>
    </>
  );
}
