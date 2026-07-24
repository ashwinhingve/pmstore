/**
 * Orders screen — view past orders, reorder, tracking.
 *
 * Features:
 * - List of past orders with status
 * - Tap to view order details and tracking timeline
 * - One-tap reorder button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Order, Paginated } from '@/lib/api/types';
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
  orderCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  orderId: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.families.mono,
  },
  orderStatus: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mintSoft,
  },
  orderStatusText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.mint,
  },
  orderDate: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  orderAmount: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
    marginBottom: theme.spacing.md,
  },
  orderItemsPreview: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  viewButton: {
    backgroundColor: theme.colors.ink,
  },
  viewButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  reorderButton: {
    backgroundColor: theme.colors.mintSoft,
    borderWidth: 1,
    borderColor: theme.colors.mint,
  },
  reorderButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.mint,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
});

export default function OrdersScreen(): React.ReactElement {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async (): Promise<Paginated<Order>> => {
      return apiClient.get<Paginated<Order>>('/orders', { page: 1, limit: 20 });
    },
  });

  const handleViewOrder = (orderId: string): void => {
    router.push(`/orders/${orderId}`);
  };

  const handleReorder = (orderId: string): void => {
    // TODO: Implement reorder — calls /api/v1/orders/[id]/reorder
    router.push(`/orders/${orderId}/reorder`);
  };

  const renderOrder = ({ item }: ListRenderItemInfo<Order>): React.ReactElement => {
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString('en-IN');
    const itemCount = item.items.length;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Order #{item._id.slice(-8)}</Text>
          <View style={styles.orderStatus}>
            <Text style={styles.orderStatusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.orderDate}>{formattedDate}</Text>

        <Text style={styles.orderAmount}>₹{item.totalAmount.toFixed(2)}</Text>

        <Text style={styles.orderItemsPreview}>
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.viewButton]}
            onPress={() => handleViewOrder(item._id)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.reorderButton]}
            onPress={() => handleReorder(item._id)}
            activeOpacity={0.7}
          >
            <Text style={styles.reorderButtonText}>Reorder</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyText}>Failed to load orders</Text>
      </View>
    );
  }

  const orders = data?.products || [];

  if (orders.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyText}>No orders yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        scrollEnabled
        style={styles.content}
      />
    </View>
  );
}
