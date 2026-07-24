/**
 * Checkout entry point — address selection, payment method choice.
 *
 * Features:
 * - Select existing address or create new
 * - Choose payment method (card, UPI, netbanking, COD)
 * - Proceed to payment
 *
 * TODO: Requires connectivity check — checkout must warn upfront if offline.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SectionList,
  SectionListRenderItemInfo,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Address } from '@/lib/api/types';
import { theme } from '@/lib/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    backgroundColor: theme.colors.paperCard,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cardActive: {
    borderColor: theme.colors.mint,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  addButton: {
    paddingVertical: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 2,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  addButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.ink,
  },
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
    minHeight: theme.touchTargets.small,
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.paper,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
  { id: 'upi', label: 'UPI', icon: '📱' },
  { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
  { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
];

export default function CheckoutScreen(): React.ReactElement {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>('cod');

  const { data: addresses, isLoading, error } = useQuery({
    queryKey: ['addresses'],
    queryFn: async (): Promise<Address[]> => {
      return apiClient.get<Address[]>('/addresses');
    },
  });

  const handleAddNewAddress = (): void => {
    router.push('/checkout/address');
  };

  const handleContinue = (): void => {
    if (!selectedAddressId) {
      Alert.alert('Select Address', 'Please select a delivery address.');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Select Payment', 'Please select a payment method.');
      return;
    }

    // Navigate to payment/confirmation based on payment method
    router.push({
      pathname: '/checkout/payment',
      params: {
        addressId: selectedAddressId,
        paymentMethod: selectedPaymentMethod,
      },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Checkout</Text>
      </View>

      <SectionList
        sections={[
          {
            title: 'Delivery Address',
            data: addresses || [],
          },
          {
            title: 'Payment Method',
            data: PAYMENT_METHODS,
          },
        ]}
        keyExtractor={(item, index) => (typeof item === 'string' ? index.toString() : item.id)}
        scrollEnabled
        style={styles.content}
        renderItem={({ section, item, index }: SectionListRenderItemInfo<unknown, unknown>) => {
          if (section.title === 'Delivery Address') {
            const address = item as Address;
            return (
              <TouchableOpacity
                onPress={() => setSelectedAddressId(address._id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.card,
                    selectedAddressId === address._id && styles.cardActive,
                  ]}
                >
                  <Text style={styles.cardTitle}>{address.type}</Text>
                  <Text style={styles.cardSubtitle}>
                    {address.street}, {address.city}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          } else if (section.title === 'Payment Method') {
            const method = item as (typeof PAYMENT_METHODS)[0];
            return (
              <TouchableOpacity
                onPress={() => setSelectedPaymentMethod(method.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.card,
                    selectedPaymentMethod === method.id && styles.cardActive,
                  ]}
                >
                  <Text style={styles.cardTitle}>
                    {method.icon} {method.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }
          return null;
        }}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
      />

      {/* If no addresses, show add button */}
      {(!addresses || addresses.length === 0) && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddNewAddress}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+ Add New Address</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <Text style={styles.continueButtonText}>Continue to Payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
