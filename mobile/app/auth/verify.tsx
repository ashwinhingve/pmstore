/**
 * OTP Verify screen — verify email with one-time password.
 *
 * User receives OTP via email, enters it here, and gets tokens.
 * Tokens are automatically stored in SecureStore by the API client.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { LoginResult } from '@/lib/api/types';
import { theme } from '@/lib/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.xl,
    letterSpacing: 4,
    marginBottom: theme.spacing.md,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  button: {
    backgroundColor: theme.colors.ink,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minHeight: theme.touchTargets.small,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.sm,
    marginBottom: theme.spacing.sm,
  },
  backButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
});

export default function VerifyScreen(): React.ReactElement {
  const { email: paramEmail } = useLocalSearchParams<{ email: string }>();
  const email = paramEmail || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuthStore();

  useEffect(() => {
    if (!email) {
      // User landed here without email param — send them back
      router.replace('/auth/login');
    }
  }, [email]);

  const handleVerify = async (): Promise<void> => {
    setError('');

    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.post<LoginResult>('/auth/otp/verify', {
        email,
        otp,
      });

      // API client automatically stores tokens in SecureStore
      // Now just set user in auth store and navigate to home
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify OTP';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = (): void => {
    router.replace('/auth/login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>We sent a code to{'\n'}{email}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={theme.colors.textTertiary}
          value={otp}
          onChangeText={setOtp}
          editable={!loading}
          maxLength={6}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.paper} />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
          <Text style={styles.backButtonText}>Didn't get the OTP? Try again</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
