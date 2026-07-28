/**
 * Home screen — the storefront entry point.
 *
 * Real content (not placeholders): a search shortcut, quick actions, the user's
 * most recent order with one-tap reorder, and a featured-medicines feed. All
 * data comes from /api/v1 via the shared apiClient.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ProductCard } from '@/lib/api/types';
import { theme } from '@/lib/theme';

/** Minimal shape of an order row from /api/v1/orders (backend fields). */
interface OrderSummary {
  _id: string;
  orderNumber?: string;
  orderStatus?: string;
  status?: string;
  totalAmount: number;
  createdAt: string;
  items?: unknown[];
}

function statusLabel(o: OrderSummary): string {
  return (o.orderStatus || o.status || 'placed').replace(/-/g, ' ');
}

export default function HomeScreen(): React.ReactElement {
  const featured = useQuery({
    queryKey: ['home', 'featured'],
    queryFn: () =>
      apiClient.get<{ products: ProductCard[] }>('/products', { limit: 6 }),
  });

  const lastOrder = useQuery({
    queryKey: ['home', 'last-order'],
    queryFn: () =>
      apiClient.get<{ products: OrderSummary[] }>('/orders', { limit: 1, page: 1 }),
  });

  const order = lastOrder.data?.products?.[0];
  const products = featured.data?.products ?? [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.brand}>PM Store</Text>
        <Text style={styles.tagline}>Genuine medicines, generic prices</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Text style={styles.searchBar}>Search medicines, salts…</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: theme.colors.rxSoft }]}
          activeOpacity={0.8}
          onPress={() => router.push('/prescription/upload')}
        >
          <Text style={styles.quickEmoji}>📄</Text>
          <Text style={styles.quickText}>Upload prescription</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: theme.colors.mintSoft }]}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/orders')}
        >
          <Text style={styles.quickEmoji}>📦</Text>
          <Text style={styles.quickText}>Your orders</Text>
        </TouchableOpacity>
      </View>

      {/* Last order */}
      {order ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your last order</Text>
          <View style={styles.orderCard}>
            <View style={styles.orderTop}>
              <Text style={styles.orderId}>
                #{order.orderNumber || order._id.slice(-8)}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{statusLabel(order)}</Text>
              </View>
            </View>
            <Text style={styles.orderAmount}>₹{order.totalAmount.toFixed(2)}</Text>
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={[styles.smallBtn, styles.smallBtnDark]}
                activeOpacity={0.8}
                onPress={() => router.push(`/orders/${order._id}`)}
              >
                <Text style={styles.smallBtnDarkText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, styles.smallBtnMint]}
                activeOpacity={0.8}
                onPress={() => router.push(`/orders/${order._id}/reorder`)}
              >
                <Text style={styles.smallBtnMintText}>Reorder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {/* Featured */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured medicines</Text>
        {featured.isLoading ? (
          <ActivityIndicator color={theme.colors.ink} style={{ marginVertical: theme.spacing.lg }} />
        ) : products.length === 0 ? (
          <Text style={styles.muted}>Nothing to show yet.</Text>
        ) : (
          products.map((p) => (
            <TouchableOpacity
              key={p._id}
              style={styles.productCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/product/${p.slug}`)}
            >
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productMeta}>
                {p.manufacturer} • {p.form}
              </Text>
              <View style={styles.priceBlock}>
                <Text style={styles.unitPrice}>₹{p.unitPrice.toFixed(2)}</Text>
                <Text style={styles.packSize}>
                  per {p.packUnit.toLowerCase()} ({p.packSize} {p.packUnit.toLowerCase()})
                </Text>
              </View>
              {p.prescriptionRequired ? (
                <View style={styles.rxBadge}>
                  <Text style={styles.rxBadgeText}>Rx required</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  header: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
  brand: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: '800',
    color: theme.colors.ink,
  },
  tagline: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: theme.spacing.md,
  },
  searchBar: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.paperCard,
    color: theme.colors.textSecondary,
    minHeight: theme.touchTargets.small,
    fontSize: theme.typography.sizes.base,
  },
  quickRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  quickCard: {
    flex: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    minHeight: theme.touchTargets.large,
    justifyContent: 'center',
  },
  quickEmoji: { fontSize: 20, marginBottom: 4 },
  quickText: { fontSize: theme.typography.sizes.sm, fontWeight: '600', color: theme.colors.ink },
  section: { marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  muted: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base },
  orderCard: {
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.families.mono,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mintSoft,
  },
  badgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.mint,
    textTransform: 'capitalize',
  },
  orderAmount: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  orderActions: { flexDirection: 'row', gap: theme.spacing.sm },
  smallBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnDark: { backgroundColor: theme.colors.ink },
  smallBtnDarkText: { color: theme.colors.paper, fontWeight: '600', fontSize: theme.typography.sizes.sm },
  smallBtnMint: { backgroundColor: theme.colors.mintSoft, borderWidth: 1, borderColor: theme.colors.mint },
  smallBtnMintText: { color: theme.colors.mint, fontWeight: '600', fontSize: theme.typography.sizes.sm },
  productCard: {
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  productName: { fontSize: theme.typography.sizes.base, fontWeight: '600', color: theme.colors.ink },
  productMeta: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 4 },
  priceBlock: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline' },
  unitPrice: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
  },
  packSize: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    fontFamily: theme.typography.families.mono,
  },
  rxBadge: {
    backgroundColor: theme.colors.rxSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  rxBadgeText: { fontSize: theme.typography.sizes.xs, color: theme.colors.rx, fontWeight: '600' },
});
