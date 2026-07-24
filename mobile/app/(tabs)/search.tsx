/**
 * Search screen — brand + salt, typo-tolerant.
 *
 * Features:
 * - Debounced search input
 * - Suggestions dropdown
 * - Results with facets (category, prescription status, price range)
 * - Recent searches from AsyncStorage
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '@/lib/api/client';
import { ProductCard, SearchResult } from '@/lib/api/types';
import { theme } from '@/lib/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.paperCard,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.ink,
    minHeight: theme.touchTargets.small,
  },
  resultsList: {
    flex: 1,
  },
  productCard: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  productName: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  productMeta: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  priceBlock: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
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
  rxBadgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.rx,
    fontWeight: '600',
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

export default function SearchScreen(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query search results
  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async (): Promise<SearchResult> => {
      return apiClient.get<SearchResult>('/search', {
        q: debouncedQuery,
        limit: 20,
        page: 1,
      });
    },
    enabled: debouncedQuery.length > 0,
  });

  const handleProductPress = (slug: string): void => {
    router.push(`/product/${slug}`);
  };

  const renderProduct = ({ item }: ListRenderItemInfo<ProductCard>): React.ReactElement => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item.slug)}
      activeOpacity={0.7}
    >
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productMeta}>
        {item.manufacturer} • {item.form}
      </Text>

      <View style={styles.priceBlock}>
        <Text style={styles.unitPrice}>₹{item.unitPrice.toFixed(2)}</Text>
        <Text style={styles.packSize}>
          per {item.packUnit.toLowerCase()} ({item.packSize} {item.packUnit.toLowerCase()})
        </Text>
      </View>

      {item.prescriptionRequired ? (
        <View style={styles.rxBadge}>
          <Text style={styles.rxBadgeText}>Rx required</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by brand or medicine name"
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading && searchQuery.length > 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.ink} size="large" />
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Failed to load results</Text>
        </View>
      ) : data && data.products.length > 0 ? (
        <FlatList
          data={data.products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          style={styles.resultsList}
          scrollEnabled
        />
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Start typing to search</Text>
        </View>
      )}
    </View>
  );
}
