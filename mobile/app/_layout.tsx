/**
 * Root layout — sets up providers, fonts, and auth gate.
 *
 * Loads fonts via expo-font before rendering the app.
 * Wraps entire app with QueryClientProvider for TanStack Query.
 * Implements auth gate to redirect to login if not signed in.
 */

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as Font from 'expo-font';
import * as SecureStore from 'expo-secure-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/client';

// Create TanStack Query client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Load custom fonts for display, body, and mono (measured values).
 *
 * TODO: Replace font file paths with your actual font assets.
 * These fonts should be in assets/fonts/:
 * - BricolageGrotesque-800.ttf (display)
 * - PublicSans-400.ttf, PublicSans-600.ttf (body)
 * - MartianMono-400.ttf (mono for prices/measurements)
 *
 * Download from:
 * - Bricolage Grotesque: https://fonts.google.com/specimen/Bricolage+Grotesque
 * - Public Sans: https://fonts.google.com/specimen/Public+Sans
 * - Martian Mono: https://fonts.google.com/specimen/Martian+Mono
 */
async function loadFonts(): Promise<void> {
  // Preview build (branch chore/mobile-preview-apk): the branded .ttf files are
  // gitignored and not present, and a require() of a missing file is a hard
  // Metro bundling error (the try/catch can't catch it — it fails at build
  // time). So we skip them and fall back to the system font. To restore the
  // branded fonts, drop the four files into assets/fonts/ and pass them to
  // loadAsync as before (see BUILD-RUNBOOK.md step 3):
  //   await Font.loadAsync({
  //     BricolageGrotesque: require('@/assets/fonts/BricolageGrotesque-800.ttf'),
  //     PublicSans: require('@/assets/fonts/PublicSans-400.ttf'),
  //     PublicSansSemibold: require('@/assets/fonts/PublicSans-600.ttf'),
  //     MartianMono: require('@/assets/fonts/MartianMono-400.ttf'),
  //   });
  await Font.loadAsync({});
}

/**
 * Root component that handles app initialization.
 */
export default function RootLayout(): React.ReactElement | null {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { isSignedIn, clearUser } = useAuthStore();

  useEffect(() => {
    // Load fonts
    loadFonts().then(() => setFontsLoaded(true));

    // Set up unauthorized callback for API client
    apiClient.setOnUnauthorized(() => {
      clearUser();
    });

    // Check if user has stored tokens on app startup
    const checkAuth = async (): Promise<void> => {
      try {
        const accessToken = await SecureStore.getItemAsync('pmstore_access_token');
        if (accessToken) {
          // TODO: Validate token and fetch user profile
          // For now, we'll assume the token is valid and the user can navigate
          // In practice, you may want to call /api/v1/auth/me or similar
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
      }
    };

    checkAuth();
  }, []);

  if (!fontsLoaded) {
    return null; // Or a splash screen
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {isSignedIn ? (
            // Authenticated: show main app navigation
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="product/[slug]" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="prescription/upload" />
            </Stack>
          ) : (
            // Unauthenticated: show auth screens
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="auth/login" />
              <Stack.Screen name="auth/verify" />
            </Stack>
          )}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
