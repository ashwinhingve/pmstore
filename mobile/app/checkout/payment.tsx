/**
 * Payment / order confirmation.
 *
 * Flow (matches /api/v1): create a pending order (recomputes prices + enforces
 * the prescription rule server-side), then either confirm COD or start a
 * Cashfree online payment. COD is the simplest verified path; online payment
 * opens Cashfree's hosted checkout in a WebView (checkout/cashfree.tsx).
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
import { apiClient } from '@/lib/api/client';
import { useCartStore } from '@/store/cart';
import { theme } from '@/lib/theme';

export default function PaymentScreen(): React.ReactElement {
  const { addressId, paymentMethod } = useLocalSearchParams<{ addressId: string; paymentMethod: string }>();
  const { items, getTotal, clearCart } = useCartStore();
  const [processing, setProcessing] = useState(false);

  const isCod = (paymentMethod || 'cod') === 'cod';
  const total = getTotal();

  const placeOrder = async () => {
    if (!addressId) {
      Alert.alert('Missing address', 'Please go back and choose a delivery address.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty cart', 'Your cart is empty.');
      return;
    }
    setProcessing(true);
    try {
      // 1) Create the pending order (server recomputes prices, enforces Rx).
      const { order } = await apiClient.post<{ order: { _id: string; orderNumber: string; totalAmount: number } }>(
        '/checkout/create-order',
        {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          shippingAddressId: addressId,
        }
      );

      if (isCod) {
        // 2a) Confirm COD — marks the order confirmed and decrements stock.
        await apiClient.post('/payment/confirm-cod', { orderId: order._id });
        await clearCart();
        Alert.alert('Order placed', `Order ${order.orderNumber} is confirmed.`, [
          { text: 'View order', onPress: () => router.replace(`/orders/${order._id}`) },
        ]);
      } else {
        // 2b) Online — get a Cashfree payment session and hand off to the WebView.
        const session = await apiClient.post<{ paymentSessionId: string; orderId: string }>(
          '/payment/initiate',
          { orderId: order._id }
        );
        router.replace({
          pathname: '/checkout/cashfree',
          params: {
            paymentSessionId: session.paymentSessionId,
            orderId: order._id,
            orderNumber: order.orderNumber,
          },
        });
      }
    } catch (e: any) {
      Alert.alert('Could not place order', e?.message || 'Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isCod ? 'Confirm order' : 'Payment'}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isCod ? '💵 Cash on Delivery' : `Pay by ${(paymentMethod || '').toUpperCase()}`}
          </Text>
          <Text style={styles.sectionText}>
            {isCod
              ? `Pay ₹${total.toFixed(2)} to our delivery partner when your order arrives.`
              : 'You’ll complete payment on Cashfree’s secure checkout on the next screen.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order total</Text>
          <Text style={styles.total}>₹{total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, processing && styles.disabled]}
          onPress={placeOrder}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator color={theme.colors.paperCard} />
          ) : (
            <Text style={styles.primaryButtonText}>{isCod ? 'Confirm order' : 'Continue to pay'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.back()}
          disabled={processing}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.paperCard,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  title: { fontSize: theme.typography.sizes.xl, fontWeight: '800', color: theme.colors.ink },
  content: { flex: 1, padding: theme.spacing.lg },
  section: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: '700', color: theme.colors.ink, marginBottom: theme.spacing.sm },
  sectionText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, lineHeight: 24 },
  total: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
  },
  button: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.touchTargets.medium,
    marginTop: theme.spacing.sm,
  },
  primaryButton: { backgroundColor: theme.colors.mint },
  primaryButtonText: { fontSize: theme.typography.sizes.base, fontWeight: '700', color: theme.colors.paperCard },
  secondaryButton: { backgroundColor: theme.colors.foilSoft, borderWidth: 1, borderColor: theme.colors.border },
  secondaryButtonText: { fontSize: theme.typography.sizes.base, fontWeight: '700', color: theme.colors.ink },
  disabled: { opacity: 0.6 },
});
