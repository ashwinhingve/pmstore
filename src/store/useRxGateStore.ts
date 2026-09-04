import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Caches the prescription + address a customer already provided to clear the
 * Schedule H/H1/X add-to-cart gate (see useGatedAddToCart), so a second
 * restricted item in the same browser doesn't force them through the gate
 * modal again. The server still re-validates the prescription at order
 * creation (prescription-guard.ts) — this cache only skips the client-side
 * prompt, it isn't itself a security boundary.
 */
interface RxGateStore {
  prescriptionId: string | null;
  addressId: string | null;
  setGate: (prescriptionId: string, addressId: string) => void;
  clearGate: () => void;
}

export const useRxGateStore = create<RxGateStore>()(
  persist(
    (set) => ({
      prescriptionId: null,
      addressId: null,
      setGate: (prescriptionId, addressId) => set({ prescriptionId, addressId }),
      clearGate: () => set({ prescriptionId: null, addressId: null }),
    }),
    {
      name: 'pmstore-rx-gate',
    }
  )
);
