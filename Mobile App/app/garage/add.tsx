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
import { VehiclePhotoPicker } from '@/components/garage/VehiclePhotoPicker';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import {
  createBuyerVehicle,
  deleteBuyerVehicle,
  fetchVehicleGarageDetail,
  updateBuyerVehicle,
} from '@/lib/api';

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
  const [formError, setFormError] = useState<string | null>(null);

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

  const validate = () => {
    if (!make.trim() || !model.trim()) {
      setFormError('Make and model are required.');
      return false;
    }
    const parsedYear = Number(year);
    if (!Number.isFinite(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      setFormError('Enter a valid year between 1900 and 2100.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const save = async () => {
    if (!profile?.customer.id || !validate()) return;
    const parsedYear = Number(year);
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
    Alert.alert('Remove vehicle', 'Delete this vehicle from your garage? Service history will remain archived.', [
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

  if (!profile?.customer.id) {
    return (
      <>
        <Stack.Screen options={{ title: 'Add vehicle' }} />
        <View style={[styles.authWrap, { backgroundColor: colors.background }]}>
          <Text style={[styles.authTitle, { color: colors.text }]}>Sign in required</Text>
          <Text style={[styles.authHint, { color: colors.textMuted }]}>
            Sign in to add and manage vehicles in your garage.
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')} style={[styles.authBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.authBtnText}>Sign in</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: editingId ? 'Edit vehicle' : 'Add vehicle' }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, backgroundColor: colors.background },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.introCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="car-sport-outline" size={22} color={colors.primary} />
          <View style={styles.introCopy}>
            <Text style={[styles.introTitle, { color: colors.text }]}>
              {editingId ? 'Update vehicle details' : 'Add a vehicle to your garage'}
            </Text>
            <Text style={[styles.introHint, { color: colors.textMuted }]}>
              Link services, track provider status, and keep maintenance history in one place.
            </Text>
          </View>
        </View>

        <SectionTitle colors={colors}>Vehicle details</SectionTitle>
        <Field label="Make *" colors={colors}>
          <TextInput
            value={make}
            onChangeText={setMake}
            placeholder="Toyota"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, inputStyle(colors)]}
          />
        </Field>
        <Field label="Model *" colors={colors}>
          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder="Corolla"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, inputStyle(colors)]}
          />
        </Field>
        <Field label="Year *" colors={colors}>
          <TextInput
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            placeholder="2020"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, inputStyle(colors)]}
          />
        </Field>

        <SectionTitle colors={colors}>Identification</SectionTitle>
        <Field label="License plate" colors={colors}>
          <TextInput
            value={licensePlate}
            onChangeText={setLicensePlate}
            placeholder="UAB 123X"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={[styles.input, inputStyle(colors)]}
          />
        </Field>
        <Field label="Nickname" colors={colors}>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="Family SUV"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, inputStyle(colors)]}
          />
        </Field>

        <SectionTitle colors={colors}>Photo</SectionTitle>
        <VehiclePhotoPicker
          colors={colors}
          value={imageUrl}
          onChange={setImageUrl}
          disabled={saving}
        />

        <SectionTitle colors={colors}>Preferences</SectionTitle>
        <Pressable onPress={() => setIsPrimary((v) => !v)} style={[styles.checkRow, { borderColor: colors.border }]}>
          <Ionicons name={isPrimary ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
          <View style={styles.checkCopy}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Primary vehicle</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              Used by default when booking services
            </Text>
          </View>
        </Pressable>

        {formError ? <Text style={[styles.formError, { color: colors.destructive }]}>{formError}</Text> : null}

        <Pressable
          onPress={() => void save()}
          disabled={saving}
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
          <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add vehicle'}</Text>
        </Pressable>

        {editingId ? (
          <Pressable onPress={() => void remove()} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontWeight: '700' }}>Remove vehicle</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}

function SectionTitle({ children, colors }: { children: string; colors: (typeof Colors)['light'] }) {
  return (
    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
      {children}
    </Text>
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
  authWrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  authTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  authHint: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  authBtn: { marginTop: 8, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  authBtnText: { color: '#fff', fontWeight: '700' },
  content: { padding: 16, gap: 10 },
  introCard: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 6,
  },
  introCopy: { flex: 1, gap: 4 },
  introTitle: { fontSize: 16, fontWeight: '800' },
  introHint: { fontSize: 13, lineHeight: 18 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginLeft: 2,
  },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  checkCopy: { flex: 1, gap: 2 },
  formError: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  primaryBtn: { marginTop: 10, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  deleteBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
});
