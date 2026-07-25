'use client';

import { create } from 'zustand';

/**
 * Transient UI notifications. Session-only, never persisted. At most three
 * toasts show at once — adding a fourth drops the oldest, and each toast
 * dismisses itself after its duration (errors linger a little longer so the
 * "what to do" line can be read).
 */
export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

const MAX_VISIBLE = 3;

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 5000,
};

interface ToastState {
  toasts: ToastItem[];
  add: (toast: { message: string; variant: ToastVariant; duration?: number }) => string;
  remove: (id: string) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  add: ({ message, variant, duration }) => {
    const id = `toast-${++nextId}`;
    const item: ToastItem = {
      id,
      message,
      variant,
      duration: duration ?? DEFAULT_DURATION[variant],
    };
    set((state) => ({ toasts: [...state.toasts, item].slice(-MAX_VISIBLE) }));
    setTimeout(() => get().remove(id), item.duration);
    return id;
  },

  remove: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

/**
 * Imperative helpers for event handlers and async callbacks — no hook needed.
 * Copy follows the house voice: sentence case, verb first, no "successfully".
 */
export const toast = {
  success: (message: string) => useToastStore.getState().add({ message, variant: 'success' }),
  error: (message: string) => useToastStore.getState().add({ message, variant: 'error' }),
  info: (message: string) => useToastStore.getState().add({ message, variant: 'info' }),
};
