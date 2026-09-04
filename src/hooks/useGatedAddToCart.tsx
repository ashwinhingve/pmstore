'use client';

import { useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCartStore, cartItemKey } from '@/store/useCartStore';
import { useRxGateStore } from '@/store/useRxGateStore';
import { toast } from '@/store/useToastStore';
import { RxGateModal } from '@/components/products/RxGateModal';

interface GatedProduct {
  _id?: string;
  id?: string;
  variantId?: string;
  name: string;
  prescriptionRequired?: boolean;
}

/**
 * Wraps useCartStore().addItem so a Schedule H/H1/X product (prescriptionRequired
 * === true) can't be added to the cart until the customer is signed in and has
 * cleared the RxGateModal (valid prescription + address) — CLAUDE.md rule #3,
 * amended 2026-09-04. OTC/G items and quantity bumps on items already in the
 * cart bypass the gate entirely, unchanged from before this hook existed.
 *
 * Render the returned `gateModal` element once, anywhere in the call site's
 * JSX — it stays mounted (with `open` toggling) so the drawer's close
 * animation can play.
 */
export function useGatedAddToCart() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const { prescriptionId, addressId, setGate } = useRxGateStore();
  const [pending, setPending] = useState<{
    product: GatedProduct;
    quantity: number;
    onAdded?: () => void;
  } | null>(null);

  const addToCart = useCallback(
    <T extends GatedProduct>(product: T, quantity = 1, onAdded?: () => void) => {
      const key = cartItemKey((product._id || product.id) as string, product.variantId);
      const alreadyInCart = items.some(
        (item) => cartItemKey(item.product.id, item.product.variantId) === key,
      );

      if (!product.prescriptionRequired || alreadyInCart) {
        addItem(product, quantity);
        onAdded?.();
        return;
      }

      if (!session?.user) {
        toast.info('Sign in to buy prescription medicines');
        router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
        return;
      }

      if (prescriptionId && addressId) {
        addItem(product, quantity);
        onAdded?.();
        return;
      }

      setPending({ product, quantity, onAdded });
    },
    [items, session, prescriptionId, addressId, addItem, router, pathname],
  );

  const handleComplete = useCallback(
    (newPrescriptionId: string, newAddressId: string) => {
      setGate(newPrescriptionId, newAddressId);
      if (pending) {
        addItem(pending.product, pending.quantity);
        pending.onAdded?.();
        setPending(null);
      }
    },
    [pending, addItem, setGate],
  );

  const gateModal = (
    <RxGateModal
      open={pending !== null}
      productName={pending?.product.name ?? ''}
      onClose={() => setPending(null)}
      onComplete={handleComplete}
    />
  );

  return { addToCart, gateModal };
}
