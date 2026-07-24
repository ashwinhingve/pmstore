/**
 * One-tap reorder screen.
 *
 * TODO: Implement reorder from past order:
 * - Fetch past order via /api/v1/orders/[id]
 * - Call /api/v1/orders/[id]/reorder to get cart items + skipped items
 * - Show skipped items with reasons (out-of-stock, discontinued)
 * - Add remaining items to cart
 * - Proceed to checkout
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '@/lib/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
});

export default function ReorderScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.placeholder}>
        TODO: Reorder from order {id}{'\n'}
        Show skipped items, add to cart, quick checkout
      </Text>
    </SafeAreaView>
  );
}
