/**
 * Order detail — items, totals, delivery address, payment, and a status
 * timeline. Data from GET /api/v1/orders/[id] (bearer auth). The timeline is
 * derived from the order's current status (the courier scan history lives in a
 * separate Shipment record; this gives an honest high-level progress view).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { theme } from '@/lib/theme';

interface OrderItemRow {
  _id: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  priceAtPurchase?: number;
}

interface OrderAddress {
  fullName?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

interface OrderDetail {
  _id: string;
  orderNumber?: string;
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  subtotal?: number;
  gstAmount?: number;
  shippingCost?: number;
  totalAmount: number;
  createdAt: string;
  estimatedDeliveryDate?: string;
  trackingNumber?: string;
  shippingProvider?: string;
  items: OrderItemRow[];
  shippingAddressId?: OrderAddress | null;
}

const STEPS = [
  { key: 'pending', label: 'Order placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrderDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => apiClient.get<{ order: OrderDetail }>(`/orders/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  const order = data?.order;
  if (error || !order) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Couldn&apos;t load this order.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = order.orderStatus || 'pending';
  const cancelled = status === 'cancelled' || status === 'refunded';
  const currentStep = STEPS.findIndex((s) => s.key === status);
  const addr = order.shippingAddressId;
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.orderNo}>#{order.orderNumber || order._id.slice(-8)}</Text>
        <Text style={styles.date}>Placed {date}</Text>
      </View>

      {/* Timeline */}
      <View style={styles.card}>
        {cancelled ? (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledText}>This order was {status}.</Text>
          </View>
        ) : (
          STEPS.map((step, i) => {
            const done = i <= currentStep;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={[styles.dot, done && styles.dotDone]} />
                {i < STEPS.length - 1 ? (
                  <View style={[styles.line, i < currentStep && styles.lineDone]} />
                ) : null}
                <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>
                  {step.label}
                </Text>
              </View>
            );
          })
        )}
        {order.trackingNumber ? (
          <Text style={styles.tracking}>
            Tracking: {order.trackingNumber}
            {order.shippingProvider ? ` (${order.shippingProvider})` : ''}
          </Text>
        ) : null}
      </View>

      {/* Items */}
      <Text style={styles.sectionTitle}>Items</Text>
      <View style={styles.card}>
        {order.items.map((it) => (
          <View key={it._id} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {it.productName || 'Item'}
            </Text>
            <Text style={styles.itemQty}>× {it.quantity}</Text>
            <Text style={styles.itemPrice}>
              ₹{((it.priceAtPurchase || 0) * it.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        {order.subtotal != null ? (
          <Row label="Subtotal" value={`₹${order.subtotal.toFixed(2)}`} />
        ) : null}
        {order.gstAmount != null ? (
          <Row label="GST" value={`₹${order.gstAmount.toFixed(2)}`} />
        ) : null}
        {order.shippingCost != null ? (
          <Row label="Delivery" value={order.shippingCost ? `₹${order.shippingCost.toFixed(2)}` : 'Free'} />
        ) : null}
        <Row label="Total" value={`₹${order.totalAmount.toFixed(2)}`} bold />
      </View>

      {/* Delivery address */}
      {addr ? (
        <>
          <Text style={styles.sectionTitle}>Delivery address</Text>
          <View style={styles.card}>
            {addr.fullName ? <Text style={styles.addrName}>{addr.fullName}</Text> : null}
            <Text style={styles.addrLine}>
              {[addr.addressLine1, addr.addressLine2].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.addrLine}>
              {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
            </Text>
            {addr.phoneNumber ? <Text style={styles.addrLine}>{addr.phoneNumber}</Text> : null}
          </View>
        </>
      ) : null}

      {/* Payment */}
      <Text style={styles.sectionTitle}>Payment</Text>
      <View style={styles.card}>
        <Row label="Method" value={(order.paymentMethod || '').toUpperCase() || '—'} />
        <Row label="Status" value={order.paymentStatus || '—'} />
      </View>

      <TouchableOpacity
        style={styles.reorderBtn}
        activeOpacity={0.85}
        onPress={() => router.push(`/orders/${order._id}/reorder`)}
      >
        <Text style={styles.reorderText}>Reorder these items</Text>
      </TouchableOpacity>

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  center: { justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md },
  muted: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base },
  linkBtn: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: theme.colors.mint, fontWeight: '600', fontSize: theme.typography.sizes.base },
  header: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
  back: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base, marginBottom: theme.spacing.sm },
  orderNo: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
  },
  date: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm, marginTop: 2 },
  sectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  card: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: theme.colors.foilSoft,
    borderWidth: 2, borderColor: theme.colors.foil,
  },
  dotDone: { backgroundColor: theme.colors.mint, borderColor: theme.colors.mint },
  line: {
    position: 'absolute', left: 5, top: 22, width: 2, height: 22,
    backgroundColor: theme.colors.foilSoft,
  },
  lineDone: { backgroundColor: theme.colors.mint },
  stepLabel: { marginLeft: theme.spacing.md, color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
  stepLabelDone: { color: theme.colors.ink, fontWeight: '600' },
  cancelledBanner: { backgroundColor: theme.colors.rxSoft, borderRadius: theme.radius.sm, padding: theme.spacing.md },
  cancelledText: { color: theme.colors.rx, fontWeight: '600', textTransform: 'capitalize' },
  tracking: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.families.mono,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm },
  itemName: { flex: 1, color: theme.colors.ink, fontSize: theme.typography.sizes.sm },
  itemQty: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.families.mono,
    marginHorizontal: theme.spacing.md,
    fontSize: theme.typography.sizes.sm,
  },
  itemPrice: {
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
    fontSize: theme.typography.sizes.sm,
    minWidth: 64,
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
  summaryValue: {
    color: theme.colors.ink,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.families.mono,
  },
  summaryBold: { color: theme.colors.ink, fontWeight: '800' },
  addrName: { fontWeight: '700', color: theme.colors.ink, marginBottom: 2, fontSize: theme.typography.sizes.sm },
  addrLine: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
  reorderBtn: {
    margin: theme.spacing.lg,
    backgroundColor: theme.colors.mint,
    borderRadius: theme.radius.md,
    minHeight: theme.touchTargets.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderText: { color: theme.colors.paperCard, fontWeight: '700', fontSize: theme.typography.sizes.base },
});
