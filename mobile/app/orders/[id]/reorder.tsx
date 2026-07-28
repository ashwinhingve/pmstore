/**
 * One-tap reorder — POST /api/v1/orders/[id]/reorder returns the diff between a
 * past order and what can be bought today. Addable lines go to the cart; skipped
 * lines (unavailable / out of stock / needs a prescription) are shown with the
 * reason. The server never re-adds Rx items to a cart (CLAUDE.md rule #3).
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
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useCartStore } from '@/store/cart';
import { theme } from '@/lib/theme';

interface AddedItem {
  productId: string;
  name: string;
  slug: string;
  quantity: number;
  price: number;
  priceChanged: boolean;
  quantityAdjusted: boolean;
}
interface SkippedItem {
  productId: string;
  name: string;
  reason: 'unavailable' | 'out_of_stock' | 'prescription_required';
}

const REASON: Record<SkippedItem['reason'], string> = {
  unavailable: 'No longer available',
  out_of_stock: 'Out of stock',
  prescription_required: 'Needs a prescription',
};

export default function ReorderScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const addItem = useCartStore((s) => s.addItem);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reorder', id],
    queryFn: () => apiClient.post<{ added: AddedItem[]; skipped: SkippedItem[] }>(`/orders/${id}/reorder`),
    enabled: !!id,
  });

  const added = data?.added ?? [];
  const skipped = data?.skipped ?? [];

  const addAllToCart = async () => {
    for (const a of added) {
      await addItem({
        productId: a.productId,
        slug: a.slug,
        name: a.name,
        quantity: a.quantity,
        unitPrice: a.price, // reorder returns pack price only; used for display
        price: a.price,
        prescriptionRequired: false, // Rx lines are never in `added`
        scheduleClass: 'OTC',
      });
    }
    router.replace('/(tabs)/cart');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Couldn&apos;t build the reorder.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reorder</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {added.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Ready to add ({added.length})</Text>
            {added.map((a) => (
              <View key={a.productId} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={2}>{a.name}</Text>
                  {a.quantityAdjusted ? (
                    <Text style={styles.note}>Quantity reduced to available stock</Text>
                  ) : null}
                  {a.priceChanged ? <Text style={styles.note}>Price updated</Text> : null}
                </View>
                <Text style={styles.qty}>× {a.quantity}</Text>
                <Text style={styles.price}>₹{(a.price * a.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.muted}>None of these items can be reordered right now.</Text>
        )}

        {skipped.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Not added ({skipped.length})</Text>
            {skipped.map((s) => (
              <View key={s.productId} style={[styles.row, styles.rowSkipped]}>
                <Text style={[styles.name, { flex: 1 }]} numberOfLines={2}>{s.name}</Text>
                <Text style={styles.reason}>{REASON[s.reason]}</Text>
              </View>
            ))}
          </>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {added.length > 0 ? (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={addAllToCart}>
            <Text style={styles.ctaText}>Add {added.length} item{added.length > 1 ? 's' : ''} to cart</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  center: { justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md },
  muted: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base },
  linkBtn: { minHeight: 44, justifyContent: 'center' },
  link: { color: theme.colors.mint, fontWeight: '600', fontSize: theme.typography.sizes.base },
  header: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
  back: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base, marginBottom: theme.spacing.sm },
  title: { fontSize: theme.typography.sizes.xl, fontWeight: '800', color: theme.colors.ink },
  content: { paddingHorizontal: theme.spacing.lg },
  sectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  rowSkipped: { opacity: 0.75 },
  name: { color: theme.colors.ink, fontSize: theme.typography.sizes.sm, fontWeight: '600' },
  note: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.xs, marginTop: 2 },
  qty: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.families.mono,
    marginHorizontal: theme.spacing.md,
    fontSize: theme.typography.sizes.sm,
  },
  price: {
    color: theme.colors.ink,
    fontFamily: theme.typography.families.mono,
    fontSize: theme.typography.sizes.sm,
    minWidth: 64,
    textAlign: 'right',
  },
  reason: { color: theme.colors.rx, fontSize: theme.typography.sizes.xs, fontWeight: '600' },
  footer: {
    padding: theme.spacing.lg,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    backgroundColor: theme.colors.paperCard,
  },
  cta: {
    backgroundColor: theme.colors.mint,
    borderRadius: theme.radius.md,
    minHeight: theme.touchTargets.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: theme.colors.paperCard, fontWeight: '700', fontSize: theme.typography.sizes.base },
});
