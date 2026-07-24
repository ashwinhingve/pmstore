/**
 * Account screen — profile, addresses, saved medicines, logout.
 *
 * Features:
 * - User profile (name, email)
 * - Saved addresses
 * - Saved medicines (wishlist)
 * - Savings counter (annual savings from purchases)
 * - Logout button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/client';
import { theme } from '@/lib/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.paperCard,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 32,
  },
  name: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  email: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  menuItem: {
    paddingVertical: theme.spacing.md,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.ink,
  },
  menuItemValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  stat: {
    paddingVertical: theme.spacing.md,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.mint,
    fontFamily: theme.typography.families.mono,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  logoutButton: {
    backgroundColor: theme.colors.rx,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minHeight: theme.touchTargets.small,
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.paper,
  },
});

export default function AccountScreen(): React.ReactElement {
  const { user, clearUser } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = (): void => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Sign Out',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await apiClient.post('/auth/logout');
            await apiClient.clearTokens();
            clearUser();
            router.replace('/auth/login');
          } catch (error) {
            console.error('Logout failed:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          } finally {
            setIsLoggingOut(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  const initials = (user.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user.name || 'User'}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Addresses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Addresses</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/account/addresses')}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemText}>Manage addresses</Text>
              <Text>→</Text>
            </TouchableOpacity>
          </View>

          {/* Saved Medicines */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Medicines</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/account/saved-medicines')}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemText}>Your wishlist</Text>
              <Text>→</Text>
            </TouchableOpacity>
          </View>

          {/* Savings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This Year's Savings</Text>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Total saved on medicine</Text>
              <Text style={styles.statValue}>₹0.00</Text>
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/account/notifications')}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemText}>Notifications</Text>
              <Text>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/account/privacy')}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemText}>Privacy & Legal</Text>
              <Text>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.7}
        >
          {isLoggingOut ? (
            <ActivityIndicator color={theme.colors.paper} />
          ) : (
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
