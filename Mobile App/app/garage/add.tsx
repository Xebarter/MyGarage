import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingView } from '@/components/LoadingView';
import {
  SERVICE_HISTORY_STATUS_LABELS,
  SERVICE_HISTORY_TYPE_LABELS,
  VEHICLE_STATUS_LABELS,
} from '@/constants/garage';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import {
  createBuyerVehicle,
  deleteBuyerVehicle,
  fetchVehicleGarageDetail,
  updateBuyerVehicle,
} from '@/lib/api';
import type { BuyerVehicle } from '@/types';

function vehicleTitle(vehicle: BuyerVehicle) {
  if (vehicle.nickname?.trim()) return vehicle.nickname.trim();
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GarageFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : undefined;
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile } = useAuth();

  const [loading, setLoading] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [licensePlate, setLicensePlate] = useState('');
  const [nickname, setNickname] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    void (async () => {
      try {
        const detail = await fetchVehicleGarageDetail(editingId);
        const v = detail.vehicle;
        setMake(v.make);
        setModel(v.model);
        setYear(String(v.year));
        setLicensePlate(v.licensePlate ?? '');
        setNickname(v.nickname ?? '');
        setImageUrl(v.imageUrl ?? '');
        setIsPrimary(v.isPrimary);
      } catch {
        Alert.alert('Error', 'Could not load vehicle details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [editingId]);

  const save = async () => {
    if (!profile?.customer.id || !make.trim() || !model.trim()) return;
    const parsedYear = Number(year);
    if (!Number.isFinite(parsedYear)) {
      Alert.alert('Invalid year', 'Enter a valid year.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customerId: profile.customer.id,
        make: make.trim(),
        model: model.trim(),
        year: parsedYear,
        licensePlate: licensePlate.trim() || null,
        imageUrl: imageUrl.trim() || null,
        nickname: nickname.trim() || null,
        isPrimary,
      };
      if (editingId) {
        await updateBuyerVehicle(editingId, payload);
        router.replace({ pathname: '/garage/[id]', params: { id: editingId } });
      } else {
        const created = await createBuyerVehicle(payload);
        router.replace({ pathname: '/garage/[id]', params: { id: created.id } });
      }
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Could not save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    Alert.alert('Remove vehicle', 'Delete this vehicle from your garage?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteBuyerVehicle(editingId);
              router.replace('/garage/index');
            } catch (err) {
              Alert.alert('Delete failed', err instanceof Error ? err.message : 'Could not delete vehicle.');
            }
          })();
        },
      },
    ]);
  };

  if (loading) return <LoadingView label="Loading vehicle" />;

  return (
    <>
      <Stack.Screen options={{ title: editingId ? 'Edit vehicle' : 'Add vehicle' }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, backgroundColor: colors.background },
        ]}
        keyboardShouldPersistTaps="handled">
        <Field label="Make" colors={colors}>
          <TextInput value={make} onChangeText={setMake} placeholder="Toyota" style={[styles.input, inputStyle(colors)]} />
        </Field>
        <Field label="Model" colors={colors}>
          <TextInput value={model} onChangeText={setModel} placeholder="Corolla" style={[styles.input, inputStyle(colors)]} />
        </Field>
        <Field label="Year" colors={colors}>
          <TextInput value={year} onChangeText={setYear} keyboardType="number-pad" style={[styles.input, inputStyle(colors)]} />
        </Field>
        <Field label="License plate (optional)" colors={colors}>
          <TextInput value={licensePlate} onChangeText={setLicensePlate} placeholder="UAB 123X" style={[styles.input, inputStyle(colors)]} />
        </Field>
        <Field label="Nickname (optional)" colors={colors}>
          <TextInput value={nickname} onChangeText={setNickname} placeholder="Family SUV" style={[styles.input, inputStyle(colors)]} />
        </Field>
        <Field label="Image URL (optional)" colors={colors}>
          <TextInput value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." autoCapitalize="none" style={[styles.input, inputStyle(colors)]} />
        </Field>
        <Pressable onPress={() => setIsPrimary((v) => !v)} style={styles.checkRow}>
          <Ionicons name={isPrimary ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
          <Text style={{ color: colors.text }}>Set as primary vehicle</Text>
        </Pressable>
        <Pressable
          onPress={() => void save()}
          disabled={saving}
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
          <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add vehicle'}</Text>
        </Pressable>
        {editingId ? (
          <Pressable onPress={() => void remove()} style={styles.deleteBtn}>
            <Text style={{ color: colors.destructive, fontWeight: '700' }}>Remove vehicle</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}

function Field({
  label,
  colors,
  children,
}: {
  label: string;
  colors: (typeof Colors)['light'];
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(colors: (typeof Colors)['light']) {
  return {
    backgroundColor: colors.card,
    borderColor: colors.border,
    color: colors.text,
  };
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  primaryBtn: { marginTop: 8, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  deleteBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
});
