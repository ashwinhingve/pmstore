/**
 * Cart screen — view, edit quantities, remove items, proceed to checkout.
 *
 * Features:
 * - Persisted to AsyncStorage (cart only)
 * - Quantity adjustment
 * - Remove item
 * - Flags Rx items and blocks checkout until prescription is attached
 * - GST breakdown
 * - Checkout button
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ListRenderItemInfo,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useCartStore } from '@/store/cart';
import { CartItem } from '@/lib/api/types';
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
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  content: {
    flex: 1,
  },
  cartItem: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomColor: theme.colors.foilSoft,
    borderBottomWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  itemName: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.ink,
    flex: 1,
  },
  removeButton: {
    padding: theme.spacing.sm,
    color: theme.colors.error,
  },
  itemMeta: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  price: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.ink,
    minWidth: 40,
    textAlign: 'center',
    fontFamily: theme.typography.families.mono,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    backgroundColor: theme.colors.paperCard,
  },
  summary: {
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
  },
  totalRow: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingTop: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  totalAmount: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
  },
  checkoutButton: {
    backgroundColor: theme.colors.mint,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minHeight: theme.touchTargets.small,
    justifyContent: 'center',
  },
  checkoutButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.paper,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  continueShoppingButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.ink,
  },
  continueShoppingText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  rxWarning: {
    backgroundColor: theme.colors.rxSoft,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  rxWarningText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.rx,
    fontWeight: '600',
  },
});

/**
 * GST calculation helper.
 * TODO: Replace with actual GST rates from your business rules.
 */
function calculateGst(amount: number): number {
  return Math.round(amount * 0.05 * 100) / 100; // 5% GST example
}

export default function CartScreen(): React.ReactElement {
  const { items, isLoading, hydrate, updateQuantity, removeItem, getTotal, getRxItems } =
    useCartStore();

  useEffect(() => {
    hydrate();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity
          style={styles.continueShoppingButton}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.7}
        >
          <Text style={styles.continueShoppingText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total = getTotal();
  const gst = calculateGst(total);
  const grandTotal = total + gst;
  const rxItems = getRxItems();

  const handleCheckout = (): void => {
    if (rxItems.length > 0) {
      Alert.alert(
        'Prescription Required',
        'This cart contains prescription medicines. You must upload a valid prescription before checkout.'
      );
      return;
    }

    router.push('/checkout');
  };

  const renderItem = ({ item }: ListRenderItemInfo<CartItem>): React.ReactElement => (
    <View style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <TouchableOpacity
          onPress={() => removeItem(item.productId)}
          activeOpacity={0.7}
        >
          <Text style={styles.removeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.itemMeta}>
        {item.prescriptionRequired ? '🔴 Rx required • ' : ''}
        ₹{item.unitPrice.toFixed(2)} per unit
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>₹{(item.price * item.quantity).toFixed(2)}</Text>

        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              updateQuantity(item.productId, Math.max(1, item.quantity - 1))
            }
            activeOpacity={0.7}
          >
            <Text>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              updateQuantity(item.productId, item.quantity + 1)
            }
            activeOpacity={0.7}
          >
            <Text>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cart</Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.productId}
        scrollEnabled
        style={styles.content}
      />

      <View style={styles.footer}>
        {rxItems.length > 0 ? (
          <View style={styles.rxWarning}>
            <Text style={styles.rxWarningText}>
              ⚠️ Prescription required: {rxItems.length} item(s) need verification
            </Text>
          </View>
        ) : null}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{total.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST (5%)</Text>
            <Text style={styles.summaryValue}>₹{gst.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>₹{grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          activeOpacity={0.7}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
