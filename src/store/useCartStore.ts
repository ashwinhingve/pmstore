import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProductData } from '@/data/products';
import type { ScheduleClass } from '@/lib/pharma/format';

// Cart product supports both DB objects (with _id) and static data (with id)
interface CartProduct {
  id: string;
  variantId?: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  images: (string | { url: string })[];
  category: string;
  // Pharma context, forwarded so the cart can flag Rx items, lead with the
  // per-unit price, and show a GST breakdown without re-fetching the product.
  prescriptionRequired?: boolean;
  scheduleClass?: ScheduleClass;
  packSize?: number;
  packUnit?: string;
  unitPrice?: number;
  mrp?: number;
  gstRate?: number;
}

interface CartItem {
  product: CartProduct;
  quantity: number;
}

export interface AppliedDiscount {
  id: string;
  code: string;        // '' for auto/first_order
  name: string;
  type: 'first_order' | 'auto' | 'coupon';
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount: number;
  minOrderValue: number;
}

interface CartStore {
  items: CartItem[];
  discount: AppliedDiscount | null;
  addItem: (product: CartProduct | ProductData | any, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (productId: string) => number;
  setDiscount: (discount: AppliedDiscount) => void;
  clearDiscount: () => void;
  getDiscountAmount: () => number;
}

export function cartItemKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}__${variantId}` : productId;
}

function normalizeProduct(product: any): CartProduct {
  return {
    id: product._id || product.id,
    variantId: product.variantId,
    name: product.name,
    slug: product.slug || '',
    price: product.price,
    originalPrice: product.originalPrice,
    images: product.images || [],
    category: product.category || '',
    prescriptionRequired: product.prescriptionRequired ?? false,
    scheduleClass: product.scheduleClass,
    packSize: product.packSize,
    packUnit: product.packUnit,
    unitPrice: product.unitPrice,
    mrp: product.mrp,
    gstRate: product.gstRate,
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discount: null,

      addItem: (product, quantity = 1) => {
        const normalized = normalizeProduct(product);
        const key = cartItemKey(normalized.id, normalized.variantId);
        set((state) => {
          const existingItem = state.items.find(
            (item) => cartItemKey(item.product.id, item.product.variantId) === key
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                cartItemKey(item.product.id, item.product.variantId) === key
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, { product: normalized, quantity }],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => cartItemKey(item.product.id, item.product.variantId) !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            cartItemKey(item.product.id, item.product.variantId) === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], discount: null });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      getItemQuantity: (productId) => {
        const item = get().items.find((item) => cartItemKey(item.product.id, item.product.variantId) === productId);
        return item ? item.quantity : 0;
      },

      setDiscount: (discount) => {
        set({ discount });
      },

      clearDiscount: () => {
        set({ discount: null });
      },

      getDiscountAmount: () => {
        const { discount, getTotalPrice } = get();
        if (!discount) return 0;
        const subtotal = getTotalPrice();
        if (discount.minOrderValue > 0 && subtotal < discount.minOrderValue) return 0;
        if (discount.discountType === 'fixed') {
          return Math.min(discount.discountValue, subtotal);
        }
        // percentage
        let amount = (subtotal * discount.discountValue) / 100;
        if (discount.maxDiscountAmount > 0) {
          amount = Math.min(amount, discount.maxDiscountAmount);
        }
        return Math.min(Math.round(amount * 100) / 100, subtotal);
      },
    }),
    {
      name: 'pmstore-cart',
    }
  )
);
