/**
 * Manage saved delivery addresses — list, add, edit, delete, set default.
 * Backed by /api/v1/addresses.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Address } from '@/lib/api/types';
import { theme } from '@/lib/theme';

export default function AddressesScreen(): React.ReactElement {
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiClient.get<{ addresses: Address[] }>('/addresses'),
  });

  const remove = useMutation({
    mutationFn: (addressId: string) => apiClient.delete(`/addresses/${addressId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (e: any) => Alert.alert('Could not delete', e?.message || 'Please try again.'),
  });

  const confirmDelete = (a: Address) =>
    Alert.alert('Delete address?', `${a.fullName}, ${a.city}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(a._id) },
    ]);

  const addresses = data?.addresses ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your addresses</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.ink} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.muted}>Couldn&apos;t load addresses. Tap to retry.</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {addresses.length === 0 ? (
            <Text style={styles.muted}>No addresses saved yet.</Text>
          ) : (
            addresses.map((a) => (
              <View key={a._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.name}>{a.fullName}</Text>
                  {a.isDefault ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Default</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.line}>
                  {[a.addressLine1, a.addressLine2, a.city, a.state, a.postalCode].filter(Boolean).join(', ')}
                </Text>
                <Text style={styles.line}>{a.phoneNumber}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => router.push(`/checkout/address?id=${a._id}`)} hitSlop={8}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(a)} hitSlop={8}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/checkout/address')}
          >
            <Text style={styles.addText}>+ Add a new address</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base },
  header: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
  back: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base, marginBottom: theme.spacing.sm },
  title: { fontSize: theme.typography.sizes.xl, fontWeight: '800', color: theme.colors.ink },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  card: {
    backgroundColor: theme.colors.paperCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: theme.typography.sizes.base, fontWeight: '700', color: theme.colors.ink, marginBottom: 2 },
  line: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  badge: {
    backgroundColor: theme.colors.mintSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  badgeText: { fontSize: theme.typography.sizes.xs, color: theme.colors.mint, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: theme.spacing.lg, marginTop: theme.spacing.md },
  editText: { color: theme.colors.mint, fontWeight: '600', fontSize: theme.typography.sizes.sm },
  deleteText: { color: theme.colors.rx, fontWeight: '600', fontSize: theme.typography.sizes.sm },
  addBtn: {
    paddingVertical: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 2,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  addText: { fontSize: theme.typography.sizes.base, fontWeight: '600', color: theme.colors.ink },
});
