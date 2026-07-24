/**
 * Payment processing screen.
 *
 * TODO: Integrate with payment gateway SDK (Cashfree or similar).
 * This is a placeholder showing the flow structure.
 *
 * Currently just shows COD confirmation.
 * For card/UPI/netbanking, integrate the gateway's React Native SDK.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useCartStore } from '@/store/cart';
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
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  sectionText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  button: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minHeight: theme.touchTargets.small,
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.mint,
  },
  primaryButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.paper,
  },
  secondaryButton: {
    backgroundColor: theme.colors.foilSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
  },
});

export default function PaymentScreen(): React.ReactElement {
  const { paymentMethod } = useLocalSearchParams<{ paymentMethod: string }>();
  const { items, getTotal, clearCart } = useCartStore();
  const [processing, setProcessing] = useState(false);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implement actual order creation
      // This should call POST /api/v1/checkout/create-order with:
      // - items from cart
      // - payment method
      // - address ID
      return apiClient.post('/checkout/create-order', {
        items: items,
        paymentMethod: paymentMethod || 'cod',
      });
    },
    onSuccess: (data: any) => {
      clearCart();
      Alert.alert(
        'Order Confirmed',
        `Your order #${data._id.slice(-8)} has been placed successfully.`,
        [
          {
            text: 'View Order',
            onPress: () => {
              router.replace(`/orders/${data._id}`);
            },
          },
          {
            text: 'Continue Shopping',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Order Failed', error.message);
      setProcessing(false);
    },
  });

  const handleConfirmCOD = async (): Promise<void> => {
    setProcessing(true);
    createOrderMutation.mutate();
  };

  const handleGoBack = (): void => {
    router.back();
  };

  const total = getTotal();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {paymentMethod === 'cod' ? 'Confirm Order' : 'Payment'}
        </Text>
      </View>

      <View style={styles.content}>
        {paymentMethod === 'cod' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💵 Cash on Delivery</Text>
              <Text style={styles.sectionText}>
                You'll pay ₹{total.toFixed(2)} to our delivery partner when your order arrives.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Total</Text>
              <Text style={[styles.sectionText, { fontSize: theme.typography.sizes.xl, fontWeight: '700', color: theme.colors.ink }]}>
                ₹{total.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleConfirmCOD}
              disabled={processing}
              activeOpacity={0.7}
            >
              {processing ? (
                <ActivityIndicator color={theme.colors.paper} />
              ) : (
                <Text style={styles.primaryButtonText}>Confirm Order</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleGoBack}
              disabled={processing}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Gateway</Text>
            <Text style={styles.sectionText}>
              TODO: Integrate {paymentMethod} payment SDK here.
              {'\n\n'}
              For now, this is a placeholder. When building the app, use the payment gateway's
              React Native SDK (e.g., Cashfree) to handle payment securely.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
