/**
 * Typed API client for /api/v1/* endpoints.
 *
 * CRITICAL: Handles token refresh with a queued single-refresh pattern.
 * If 5 requests get 401 simultaneously, they must NOT fire 5 refresh attempts.
 * Instead, the first request's refresh is shared across all 5, then retried once.
 *
 * If refresh fails (invalid refresh token), clear storage and route to login.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiEnvelope,
  TokenPair,
  RefreshTokenBody,
} from './types';

// API base — set this to your backend URL
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.pratigyamedicalstore.com';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

class ApiClient {
  private client: AxiosInstance;
  private inFlightRefresh: Promise<TokenPair> | null = null;
  private tokens: StoredTokens | null = null;
  private onUnauthorized: (() => void) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE}/api/v1`,
      timeout: 10000,
    });

    // Request interceptor: attach access token
    this.client.interceptors.request.use(
      async (config) => {
        const tokens = await this.getTokens();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle 401 with refresh and retry
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalConfig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalConfig._retry) {
          originalConfig._retry = true;

          try {
            // Queue: only one refresh at a time
            const newTokens = await this.refreshAccessToken();
            if (newTokens) {
              originalConfig.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.client(originalConfig);
            }
          } catch (refreshError) {
            // Refresh failed: clear tokens and notify app to redirect to login
            await this.clearTokens();
            if (this.onUnauthorized) {
              this.onUnauthorized();
            }
            return Promise.reject(refreshError);
          }
        }

        // Check response envelope for apiVersion
        if (error.response?.data) {
          const data = error.response.data as ApiEnvelope<unknown>;
          if (data.apiVersion !== 1) {
            // API version mismatch — prompt user to update app
            console.warn('API version mismatch:', data.apiVersion);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Queue single refresh so concurrent 401s don't fire multiple refreshes.
   */
  private async refreshAccessToken(): Promise<TokenPair | null> {
    // If a refresh is already in flight, await it instead of starting another
    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }

    const tokens = await this.getTokens();
    if (!tokens?.refreshToken) {
      return null;
    }

    this.inFlightRefresh = (async () => {
      try {
        const response = await this.client.post<ApiEnvelope<TokenPair>>('/auth/refresh', {
          refreshToken: tokens.refreshToken,
        } as RefreshTokenBody);

        if (!response.data?.data) {
          throw new Error('Invalid refresh response');
        }

        const newTokens = response.data.data;
        await this.storeTokens(newTokens);
        this.tokens = newTokens;
        return newTokens;
      } finally {
        this.inFlightRefresh = null;
      }
    })();

    return this.inFlightRefresh;
  }

  /**
   * Get tokens from SecureStore (never AsyncStorage).
   */
  private async getTokens(): Promise<StoredTokens | null> {
    if (this.tokens) {
      return this.tokens;
    }

    try {
      const accessToken = await SecureStore.getItemAsync('pmstore_access_token');
      const refreshToken = await SecureStore.getItemAsync('pmstore_refresh_token');

      if (accessToken && refreshToken) {
        this.tokens = { accessToken, refreshToken };
        return this.tokens;
      }
    } catch (error) {
      console.error('Failed to retrieve tokens from SecureStore:', error);
    }

    return null;
  }

  /**
   * Store tokens in SecureStore (never AsyncStorage).
   */
  private async storeTokens(tokens: TokenPair): Promise<void> {
    try {
      await Promise.all([
        SecureStore.setItemAsync('pmstore_access_token', tokens.accessToken),
        SecureStore.setItemAsync('pmstore_refresh_token', tokens.refreshToken),
      ]);
      this.tokens = tokens;
    } catch (error) {
      console.error('Failed to store tokens in SecureStore:', error);
      throw error;
    }
  }

  /**
   * Clear tokens when logging out or on auth failure.
   */
  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('pmstore_access_token'),
        SecureStore.deleteItemAsync('pmstore_refresh_token'),
      ]);
      this.tokens = null;
    } catch (error) {
      console.error('Failed to clear tokens from SecureStore:', error);
    }
  }

  /**
   * Register callback to be called when user becomes unauthorized (401 + refresh fails).
   * App should use this to navigate to login screen.
   */
  setOnUnauthorized(callback: () => void): void {
    this.onUnauthorized = callback;
  }

  /**
   * Generic typed GET request.
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<ApiEnvelope<T>>(endpoint, { params });
    this.validateEnvelope(response.data);
    return response.data.data as T;
  }

  /**
   * Generic typed POST request.
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.post<ApiEnvelope<T>>(endpoint, data);
    this.validateEnvelope(response.data);
    return response.data.data as T;
  }

  /**
   * Generic typed PATCH request.
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<ApiEnvelope<T>>(endpoint, data);
    this.validateEnvelope(response.data);
    return response.data.data as T;
  }

  /**
   * Generic typed DELETE request.
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.client.delete<ApiEnvelope<T>>(endpoint);
    this.validateEnvelope(response.data);
    return response.data.data as T;
  }

  /**
   * Validate response envelope and extract data.
   */
  private validateEnvelope<T>(envelope: ApiEnvelope<T>): void {
    if (envelope.apiVersion !== 1) {
      throw new Error(`API version mismatch: expected 1, got ${envelope.apiVersion}`);
    }

    if (envelope.error) {
      throw new Error(envelope.error.message);
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient();

export default apiClient;
