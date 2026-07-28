/**
 * Checkout entry — pick a delivery address and a payment method, then continue
 * to payment. Addresses come from GET /api/v1/addresses; the default one is
 * pre-selected. COD is pre-selected as the payment method.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Address } from '@/lib/api/types';
import { theme } from '@/lib/theme';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
  { id: 'upi', label: 'UPI', icon: '📱' },
  { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
];

export default function CheckoutScreen(): React.ReactElement {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cod');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiClient.get<{ addresses: Address[] }>('/addresses'),
  });

  const addresses = data?.addresses ?? [];

  // Pre-select the default (or first) address once loaded.
  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddressId(def._id);
    }
  }, [addresses, selectedAddressId]);

  const handleContinue = (): void => {
    if (!selectedAddressId) {
      Alert.alert('Select address', 'Please choose a delivery address.');
      return;
    }
    router.push({
      pathname: '/checkout/payment',
      params: { addressId: selectedAddressId, paymentMethod: selectedPaymentMethod },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Checkout</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
        {/* Delivery address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery address</Text>

          {error ? (
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.muted}>Couldn&apos;t load addresses. Tap to retry.</Text>
            </TouchableOpacity>
          ) : addresses.length === 0 ? (
            <Text style={styles.muted}>No saved addresses yet.</Text>
          ) : (
            addresses.map((a) => {
              const active = selectedAddressId === a._id;
              return (
                <TouchableOpacity key={a._id} activeOpacity={0.8} onPress={() => setSelectedAddressId(a._id)}>
                  <View style={[styles.card, active && styles.cardActive]}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{a.fullName}</Text>
                      {a.isDefault ? (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.cardSubtitle}>
                      {[a.addressLine1, a.addressLine2, a.city, a.state, a.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                    <Text style={styles.cardSubtitle}>{a.phoneNumber}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => router.push('/checkout/address')}
          >
            <Text style={styles.addButtonText}>+ Add a new address</Text>
          </TouchableOpacity>
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          {PAYMENT_METHODS.map((m) => {
            const active = selectedPaymentMethod === m.id;
            return (
              <TouchableOpacity key={m.id} activeOpacity={0.8} onPress={() => setSelectedPaymentMethod(m.id)}>
                <View style={[styles.card, active && styles.cardActive]}>
                  <Text style={styles.cardTitle}>
                    {m.icon}  {m.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>Continue to payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: theme.spacing.lg,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    backgroundColor: theme.colors.paperCard,
  },
  title: { fontSize: theme.typography.sizes.xl, fontWeight: '800', color: theme.colors.ink },
  content: { flex: 1 },
  section: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  muted: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base, marginBottom: theme.spacing.md },
  card: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cardActive: { borderColor: theme.colors.mint },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: theme.typography.sizes.base, fontWeight: '700', color: theme.colors.ink, marginBottom: 4 },
  cardSubtitle: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  defaultBadge: {
    backgroundColor: theme.colors.mintSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  defaultBadgeText: { fontSize: theme.typography.sizes.xs, color: theme.colors.mint, fontWeight: '600' },
  addButton: {
    paddingVertical: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 2,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  addButtonText: { fontSize: theme.typography.sizes.base, fontWeight: '600', color: theme.colors.ink },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    backgroundColor: theme.colors.paperCard,
  },
  continueButton: {
    backgroundColor: theme.colors.mint,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minHeight: theme.touchTargets.medium,
    justifyContent: 'center',
  },
  continueButtonText: { fontSize: theme.typography.sizes.base, fontWeight: '700', color: theme.colors.paperCard },
});
