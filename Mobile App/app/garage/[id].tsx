import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import {
  SERVICE_HISTORY_STATUS_LABELS,
  SERVICE_HISTORY_TYPE_LABELS,
  VEHICLE_STATUS_LABELS,
} from '@/constants/garage';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchVehicleGarageDetail } from '@/lib/api';
import type { BuyerVehicle, VehicleServiceHistoryEntry } from '@/types';

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

export default function GarageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [vehicle, setVehicle] = useState<BuyerVehicle | null>(null);
  const [history, setHistory] = useState<VehicleServiceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setError(null);
    try {
      const detail = await fetchVehicleGarageDetail(id, { sortBy: 'date', sortOrder });
      setVehicle(detail.vehicle);
      setHistory(detail.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load vehicle.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, sortOrder]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => void load(true), 15000);
    return () => clearInterval(timer);
  }, [load]);

  const title = useMemo(() => (vehicle ? vehicleTitle(vehicle) : 'Vehicle'), [vehicle]);

  if (loading) return <LoadingView label="Loading vehicle" />;
  if (error || !vehicle) {
    return (
      <>
        <Stack.Screen options={{ title: 'Vehicle' }} />
        <EmptyState title="Unavailable" message={error ?? 'Vehicle not found.'} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/garage/add', params: { id: vehicle.id } })}
              hitSlop={8}
              style={{ marginRight: 4 }}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} />}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, backgroundColor: colors.background },
        ]}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroImage, { backgroundColor: colors.border }]}>
            {vehicle.imageUrl ? (
              <Image source={{ uri: vehicle.imageUrl }} style={styles.heroImageFill} />
            ) : (
              <Ionicons name="car-sport" size={48} color={colors.textMuted} />
            )}
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>
            {vehicle.year} {vehicle.make} {vehicle.model}
            {vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ''}
          </Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Status</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {VEHICLE_STATUS_LABELS[vehicle.vehicleStatus]}
              </Text>
              <Text style={[styles.statHint, { color: colors.textMuted }]}>Set by your last provider</Text>
            </View>
            <View style={[styles.statBox, { borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Next service</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{formatDate(vehicle.nextServiceDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Service history</Text>
          <Pressable onPress={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
              {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
            </Text>
          </Pressable>
        </View>

        {history.length === 0 ? (
          <View style={[styles.emptyHistory, { borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
              No service records yet. Book a service linked to this vehicle to build your timeline.
            </Text>
          </View>
        ) : (
          history.map((entry) => (
            <View key={entry.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.historyTop}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>{entry.serviceName}</Text>
                <View style={[styles.pill, { backgroundColor: colors.primary + '14' }]}>
                  <Text style={[styles.pillText, { color: colors.primary }]}>
                    {SERVICE_HISTORY_STATUS_LABELS[entry.status]}
                  </Text>
                </View>
              </View>
              <Text style={[styles.historyMeta, { color: colors.textMuted }]}>
                {SERVICE_HISTORY_TYPE_LABELS[entry.serviceType]} · {formatDate(entry.serviceDate)}
              </Text>
              <Text style={[styles.historyProvider, { color: colors.text }]}>
                Provider: {entry.providerName || '—'}
              </Text>
              {entry.notes ? (
                <Text style={[styles.historyNotes, { color: colors.textMuted }]}>{entry.notes}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  heroCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  heroImage: {
    height: 160,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  heroImageFill: { width: '100%', height: '100%' },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroSub: { fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  statBox: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '700' },
  statHint: { fontSize: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  emptyHistory: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 20 },
  historyCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  historyTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '800' },
  historyMeta: { fontSize: 12 },
  historyProvider: { fontSize: 13, fontWeight: '600' },
  historyNotes: { fontSize: 13, lineHeight: 18 },
});
