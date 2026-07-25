'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/useCartStore';
import { toast } from '@/store/useToastStore';
import type { CompareProduct } from '@/lib/pharma/compare';

/**
 * Client island under the compare verdict. The page stays a Server Component;
 * only this button needs the cart store.
 */
export function AddBestToCartButton({ product }: { product: CompareProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  return (
    <Button
      size="sm"
      onClick={() => {
        addItem({ ...product, images: [], category: '' }, 1);
        toast.success(`${product.name} added to cart`);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      disabled={added}
      className="h-11 bg-[var(--mint)] px-5 text-sm font-semibold text-[var(--paper-card)] hover:bg-[var(--mint-deep)]"
    >
      {added ? 'Added to cart' : `Add ${product.name} to cart`}
    </Button>
  );
}
