/**
 * Auth state — manages user session.
 *
 * Tokens are stored in expo-secure-store via the API client.
 * This store holds the authenticated user object and session state.
 */

import { create } from 'zustand';
import { AuthUser } from '@/lib/api/types';

interface AuthStore {
  user: AuthUser | null;
  isSignedIn: boolean;
  isLoading: boolean;

  // Set user after successful login
  setUser(user: AuthUser): void;

  // Clear user on logout
  clearUser(): void;

  // Set loading state during auth operations
  setLoading(loading: boolean): void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isSignedIn: false,
  isLoading: false,

  setUser: (user) => {
    set({ user, isSignedIn: true, isLoading: false });
  },

  clearUser: () => {
    set({ user: null, isSignedIn: false, isLoading: false });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));
