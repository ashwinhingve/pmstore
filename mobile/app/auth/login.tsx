/**
 * Login screen — email OTP request.
 *
 * User enters email, we send OTP via /api/v1/auth/otp/request.
 * On success, navigate to verify screen.
 */

import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { apiClient } from '@/lib/api/client';
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
    fontSize: theme.typography.sizes.base,
    marginBottom: theme.spacing.md,
    color: theme.colors.ink,
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
});

export default function LoginScreen(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (): Promise<void> => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/otp/request', { email });

      // Navigate to verify screen with email as param
      router.push({
        pathname: '/auth/verify',
        params: { email },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View>
        <Text style={styles.title}>PMStore</Text>
        <Text style={styles.subtitle}>Sign in with your email</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRequestOtp}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.paper} />
          ) : (
            <Text style={styles.buttonText}>Send OTP</Text>
          )}
        </TouchableOpacity>

        <Text
          style={{
            marginTop: theme.spacing.lg,
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.textTertiary,
            textAlign: 'center',
          }}
        >
          We'll send a one-time password to verify your email.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
