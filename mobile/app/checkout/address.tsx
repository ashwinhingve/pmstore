/**
 * Add / edit a delivery address. Writes to /api/v1/addresses (POST) or
 * /api/v1/addresses/[id] (PATCH when editing). On success it refreshes the
 * cached address list and returns. Field rules match the server (Indian
 * 10-digit mobile, 6-digit PIN).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Address } from '@/lib/api/types';
import { theme } from '@/lib/theme';

type Form = {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

const EMPTY: Form = {
  fullName: '', phoneNumber: '', addressLine1: '', addressLine2: '',
  city: '', state: '', postalCode: '', isDefault: false,
};

export default function AddressFormScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const qc = useQueryClient();

  // For edit: pull the address out of the cached list (or fetch it).
  const { data, isLoading: loadingExisting } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiClient.get<{ addresses: Address[] }>('/addresses'),
    enabled: editing,
  });

  const existing = editing ? data?.addresses.find((a) => a._id === id) : undefined;

  const [form, setForm] = useState<Form>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  // Prefill once when editing.
  if (editing && existing && !hydrated) {
    setForm({
      fullName: existing.fullName || '',
      phoneNumber: existing.phoneNumber || '',
      addressLine1: existing.addressLine1 || '',
      addressLine2: existing.addressLine2 || '',
      city: existing.city || '',
      state: existing.state || '',
      postalCode: existing.postalCode || '',
      isDefault: !!existing.isDefault,
    });
    setHydrated(true);
  }

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (payload: Form) =>
      editing
        ? apiClient.patch(`/addresses/${id}`, payload)
        : apiClient.post('/addresses', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      router.back();
    },
    onError: (e: any) => Alert.alert('Could not save', e?.message || 'Please try again.'),
  });

  const onSave = () => {
    if (!form.fullName.trim()) return Alert.alert('Name required', 'Enter the recipient name.');
    if (!/^[6-9]\d{9}$/.test(form.phoneNumber)) return Alert.alert('Invalid mobile', 'Enter a 10-digit mobile number.');
    if (!form.addressLine1.trim()) return Alert.alert('Address required', 'Enter the street address.');
    if (!form.city.trim() || !form.state.trim()) return Alert.alert('Missing details', 'Enter city and state.');
    if (!/^\d{6}$/.test(form.postalCode)) return Alert.alert('Invalid PIN', 'Enter a 6-digit PIN code.');
    mutation.mutate(form);
  };

  if (editing && loadingExisting && !hydrated) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.back}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{editing ? 'Edit address' : 'Add address'}</Text>

      <Field label="Full name" value={form.fullName} onChangeText={set('fullName')} autoCapitalize="words" />
      <Field
        label="Mobile number"
        value={form.phoneNumber}
        onChangeText={(v) => set('phoneNumber')(v.replace(/\D/g, '').slice(0, 10))}
        keyboardType="number-pad"
        placeholder="10-digit mobile"
      />
      <Field label="Flat / house, street" value={form.addressLine1} onChangeText={set('addressLine1')} />
      <Field label="Area, landmark (optional)" value={form.addressLine2} onChangeText={set('addressLine2')} />
      <Field label="City" value={form.city} onChangeText={set('city')} autoCapitalize="words" />
      <Field label="State" value={form.state} onChangeText={set('state')} autoCapitalize="words" />
      <Field
        label="PIN code"
        value={form.postalCode}
        onChangeText={(v) => set('postalCode')(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        placeholder="6-digit PIN"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Set as default address</Text>
        <Switch
          value={form.isDefault}
          onValueChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
          trackColor={{ true: theme.colors.mint, false: theme.colors.foil }}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, mutation.isPending && styles.saveBtnDisabled]}
        onPress={onSave}
        disabled={mutation.isPending}
        activeOpacity={0.85}
      >
        <Text style={styles.saveText}>
          {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Save address'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
}

function Field({
  label, ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={theme.colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: theme.spacing.lg },
  back: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base, marginBottom: theme.spacing.sm },
  title: { fontSize: theme.typography.sizes.xl, fontWeight: '800', color: theme.colors.ink, marginBottom: theme.spacing.lg },
  field: { marginBottom: theme.spacing.md },
  fieldLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.ink,
    backgroundColor: theme.colors.paperCard,
    minHeight: theme.touchTargets.small,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  switchLabel: { fontSize: theme.typography.sizes.base, color: theme.colors.ink },
  saveBtn: {
    backgroundColor: theme.colors.mint,
    borderRadius: theme.radius.md,
    minHeight: theme.touchTargets.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: theme.colors.paperCard, fontWeight: '700', fontSize: theme.typography.sizes.base },
});
