'use client';

import { create } from 'zustand';

/**
 * Saved medicines are server-authoritative (per user), so this store is NOT
 * persisted to localStorage — it loads from /api/saved and mutates optimistically.
 * The set arithmetic is a pure function so it can be unit-tested.
 */
export function applyToggle(ids: string[], id: string): { ids: string[]; nowSaved: boolean } {
  const set = new Set(ids);
  if (set.has(id)) {
    set.delete(id);
    return { ids: [...set], nowSaved: false };
  }
  set.add(id);
  return { ids: [...set], nowSaved: true };
}

interface SavedState {
  ids: string[];
  loaded: boolean;
  isSaved: (id: string) => boolean;
  load: () => Promise<void>;
  toggle: (id: string) => Promise<void>;
}

export const useSavedStore = create<SavedState>((set, get) => ({
  ids: [],
  loaded: false,
  isSaved: (id) => get().ids.includes(id),

  load: async () => {
    try {
      const res = await fetch('/api/saved');
      if (!res.ok) return; // signed out (401) or transient — leave ids empty
      const json = await res.json();
      const ids = (json.data ?? [])
        .map((s: { product?: { _id?: string } }) => s.product?._id)
        .filter(Boolean) as string[];
      set({ ids, loaded: true });
    } catch {
      /* offline — the button still works optimistically */
    }
  },

  toggle: async (id) => {
    const { ids, nowSaved } = applyToggle(get().ids, id);
    set({ ids }); // optimistic
    try {
      const res = nowSaved
        ? await fetch('/api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: id }),
          })
        : await fetch(`/api/saved/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('save failed');
    } catch {
      set({ ids: applyToggle(get().ids, id).ids }); // revert
    }
  },
}));
