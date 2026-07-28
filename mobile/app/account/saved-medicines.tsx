/**
 * Saved medicines (wishlist) — GET /api/v1/saved-medicines. Each item can be
 * added to the cart or removed. Tapping opens the product page.
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useCartStore } from '@/store/cart';
import { theme } from '@/lib/theme';

interface SavedProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  unitPrice: number;
  packSize: number;
  packUnit: string;
  prescriptionRequired: boolean;
  scheduleClass: 'OTC' | 'H' | 'H1' | 'X' | 'G';
}
interface SavedRow {
  _id: string;
  savedAt: string;
  product: SavedProduct;
}

export default function SavedMedicinesScreen(): React.ReactElement {
  const qc = useQueryClient();
  const addItem = useCartStore((s) => s.addItem);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['saved-medicines'],
    queryFn: () => apiClient.get<{ medicines: SavedRow[] }>('/saved-medicines'),
  });

  const remove = useMutation({
    mutationFn: (savedId: string) => apiClient.delete(`/saved-medicines/${savedId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-medicines'] }),
  });

  const rows = (data?.medicines ?? []).filter((r) => r.product);

  const addToCart = (p: SavedProduct) =>
    addItem({
      productId: p._id,
      slug: p.slug,
      name: p.name,
      quantity: 1,
      unitPrice: p.unitPrice,
      price: p.price,
      prescriptionRequired: p.prescriptionRequired,
      scheduleClass: p.scheduleClass,
    });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved medicines</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.ink} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.muted}>Couldn&apos;t load saved medicines. Tap to retry.</Text>
          </TouchableOpacity>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>You haven&apos;t saved any medicines yet.</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')} style={styles.linkBtn}>
            <Text style={styles.link}>Browse medicines</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {rows.map(({ _id, product: p }) => (
            <View key={_id} style={styles.card}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/product/${p.slug}`)}>
                <Text style={styles.name}>{p.name}</Text>
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
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.addBtn}
                  activeOpacity={0.85}
                  onPress={() => addToCart(p)}
                >
                  <Text style={styles.addText}>Add to cart</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove.mutate(_id)} hitSlop={8}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: theme.spacing.xl }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg },
  muted: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base, textAlign: 'center' },
  linkBtn: { minHeight: 44, justifyContent: 'center' },
  link: { color: theme.colors.mint, fontWeight: '600', fontSize: theme.typography.sizes.base },
  header: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
  back: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base, marginBottom: theme.spacing.sm },
  title: { fontSize: theme.typography.sizes.xl, fontWeight: '800', color: theme.colors.ink },
  content: { paddingHorizontal: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  name: { fontSize: theme.typography.sizes.base, fontWeight: '600', color: theme.colors.ink },
  priceBlock: { marginTop: 6, flexDirection: 'row', alignItems: 'baseline' },
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  addBtn: {
    backgroundColor: theme.colors.mintSoft,
    borderWidth: 1,
    borderColor: theme.colors.mint,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: theme.colors.mint, fontWeight: '600', fontSize: theme.typography.sizes.sm },
  removeText: { color: theme.colors.rx, fontWeight: '600', fontSize: theme.typography.sizes.sm },
});
