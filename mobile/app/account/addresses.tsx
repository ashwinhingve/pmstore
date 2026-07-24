/**
 * Manage delivery addresses.
 *
 * TODO: Implement address list and CRUD operations.
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

export default function AddressesScreen(): React.ReactElement {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.placeholder}>TODO: Address list and management</Text>
    </SafeAreaView>
  );
}
