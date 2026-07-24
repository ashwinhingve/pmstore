/**
 * Order detail screen — shows full order information and tracking timeline.
 *
 * TODO: Implement order details with:
 * - Order info (ID, date, total)
 * - Delivery address
 * - Order items
 * - Tracking timeline
 * - Reorder button
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

export default function OrderDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.placeholder}>
        TODO: Order detail for {id}{'\n'}
        Items, timeline, address, reorder button
      </Text>
    </SafeAreaView>
  );
}
