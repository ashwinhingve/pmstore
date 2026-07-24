/**
 * Cart state — persisted to AsyncStorage (cart only, never tokens).
 *
 * This mirrors the web cart but stores in AsyncStorage for offline access.
 * All cart operations are synchronous in-memory; persistence happens async.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem } from '@/lib/api/types';

const STORAGE_KEY = 'pmstore-cart';

interface CartStore {
  items: CartItem[];
  isLoading: boolean;

  // Mutations
  addItem(item: CartItem): Promise<void>;
  updateQuantity(productId: string, quantity: number): Promise<void>;
  removeItem(productId: string): Promise<void>;
  clearCart(): Promise<void>;

  // Queries
  getTotal(): number;
  getTotalQuantity(): number;
  getRxItems(): CartItem[];

  // Initialization
  hydrate(): Promise<void>;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isLoading: false,

  addItem: async (item) => {
    const current = get().items;
    const existing = current.find((i) => i.productId === item.productId);

    let updated: CartItem[];
    if (existing) {
      updated = current.map((i) =>
        i.productId === item.productId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
    } else {
      updated = [...current, item];
    }

    set({ items: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  updateQuantity: async (productId, quantity) => {
    const updated = get().items.map((i) =>
      i.productId === productId ? { ...i, quantity } : i
    );

    set({ items: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  removeItem: async (productId) => {
    const updated = get().items.filter((i) => i.productId !== productId);

    set({ items: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  clearCart: async () => {
    set({ items: [] });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getTotalQuantity: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getRxItems: () => {
    return get().items.filter((item) => item.prescriptionRequired);
  },

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as CartItem[];
        set({ items });
      }
    } catch (error) {
      console.error('Failed to hydrate cart:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
