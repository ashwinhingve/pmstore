/**
 * Home screen — search-first entry point.
 *
 * Shows:
 * - Search bar
 * - Last order (if available)
 * - Upload prescription shortcut
 * - Featured/recent products
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/lib/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: '800',
    color: theme.colors.ink,
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
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  section: {
    marginVertical: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  placeholder: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  placeholderText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.base,
  },
});

export default function HomeScreen(): React.ReactElement {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>PMStore</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Text style={styles.searchBar}>Search medicines...</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* TODO: Last Order Section */}
        <View style={styles.section}>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Last order will appear here</Text>
          </View>
        </View>

        {/* TODO: Upload Prescription Shortcut */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/prescription/upload')}
          >
            <View style={[styles.placeholder, { backgroundColor: theme.colors.rxSoft }]}>
              <Text style={styles.placeholderText}>📸 Upload a prescription</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* TODO: Featured Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Medicines</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Product list will appear here</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
