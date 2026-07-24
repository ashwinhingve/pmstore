/**
 * Address management screen — add or edit delivery address.
 *
 * TODO: Implement address form with fields:
 * - Street address
 * - City
 * - State
 * - Postal code
 * - Address type (home/work/other)
 * - Set as default
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

export default function AddressScreen(): React.ReactElement {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.placeholder}>
        TODO: Address management form{'\n'}
        Fields: street, city, state, postal code, type, set as default
      </Text>
    </SafeAreaView>
  );
}
