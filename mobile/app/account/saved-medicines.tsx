/**
 * Saved medicines (wishlist) screen.
 *
 * TODO: Implement saved medicines list with:
 * - Fetched from /api/v1/saved-medicines
 * - Add to cart button for each
 * - Remove from wishlist
 * - Sort/filter options
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
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

export default function SavedMedicinesScreen(): React.ReactElement {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.placeholder}>TODO: Saved medicines wishlist</Text>
    </SafeAreaView>
  );
}
