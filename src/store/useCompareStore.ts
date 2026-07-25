'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * The compare picker: at most two products chosen from cards or search.
 * Session-scoped (sessionStorage, not localStorage) — a comparison in
 * progress shouldn't follow someone around for weeks. The pure `applyPick`
 * carries the arithmetic so it can be unit-tested.
 */
export interface ComparePick {
  id: string;
  name: string;
}

export function applyPick(picks: ComparePick[], pick: ComparePick): ComparePick[] {
  if (picks.some((p) => p.id === pick.id)) {
    return picks.filter((p) => p.id !== pick.id);
  }
  return [...picks, pick].slice(-2);
}

interface CompareState {
  picks: ComparePick[];
  /** Toggle a product in/out of the comparison; returns the new picks. */
  pick: (p: ComparePick) => ComparePick[];
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      picks: [],
      pick: (p) => {
        const picks = applyPick(get().picks, p);
        set({ picks });
        return picks;
      },
      clear: () => set({ picks: [] }),
    }),
    {
      name: 'pmstore-compare',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
