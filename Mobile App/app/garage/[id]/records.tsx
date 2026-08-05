import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ServiceRecordCard } from '@/components/garage/ServiceRecordCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import {
  SERVICE_HISTORY_STATUSES,
  SERVICE_HISTORY_STATUS_LABELS,
  SERVICE_HISTORY_TYPES,
  SERVICE_HISTORY_TYPE_LABELS,
} from '@/constants/garage';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchVehicleGarageDetail } from '@/lib/api';
import { formatGarageDate, vehicleSubtitle, vehicleTitle } from '@/lib/garage-format';
import type { BuyerVehicle, VehicleServiceHistoryEntry } from '@/types';

type FilterType = 'all' | (typeof SERVICE_HISTORY_TYPES)[number];
type FilterStatus = 'all' | (typeof SERVICE_HISTORY_STATUSES)[number];

export default function VehicleServiceRecordsScreen() {
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
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const detail = await fetchVehicleGarageDetail(id, {
        sortBy: 'date',
        sortOrder,
        ...(filterType !== 'all' ? { serviceType: filterType } : {}),
        ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
      });
      setVehicle(detail.vehicle);
      setHistory(detail.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load service records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, filterType, id, sortOrder]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const completed = history.filter((e) => e.status === 'completed').length;
    const last = history[0]?.serviceDate ?? null;
    return { total: history.length, completed, last };
  }, [history]);

  if (loading && !vehicle) return <LoadingView label="Loading records" />;
  if (error || !vehicle) {
    return (
      <>
        <Stack.Screen options={{ title: 'Service records' }} />
        <EmptyState title="Unavailable" message={error ?? 'Vehicle not found.'} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Service records' }} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, backgroundColor: colors.background },
        ]}>
        <View style={[styles.introCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.introTitle, { color: colors.text }]}>{vehicleTitle(vehicle)}</Text>
          <Text style={[styles.introSub, { color: colors.textMuted }]}>{vehicleSubtitle(vehicle)}</Text>
          <Text style={[styles.introHint, { color: colors.textMuted }]}>
            Complete maintenance timeline for this vehicle, including provider details and linked service requests.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.total}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total records</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{summary.completed}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Completed</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryValueSmall, { color: colors.text }]} numberOfLines={1}>
              {formatGarageDate(summary.last)}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Last service</Text>
          </View>
        </View>

        <View style={styles.filtersSection}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filter & sort</Text>
            <Pressable onPress={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <FilterChip
              label="All types"
              active={filterType === 'all'}
              colors={colors}
              onPress={() => setFilterType('all')}
            />
            {SERVICE_HISTORY_TYPES.map((type) => (
              <FilterChip
                key={type}
                label={SERVICE_HISTORY_TYPE_LABELS[type]}
                active={filterType === type}
                colors={colors}
                onPress={() => setFilterType(type)}
              />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <FilterChip
              label="All statuses"
              active={filterStatus === 'all'}
              colors={colors}
              onPress={() => setFilterStatus('all')}
            />
            {SERVICE_HISTORY_STATUSES.map((status) => (
              <FilterChip
                key={status}
                label={SERVICE_HISTORY_STATUS_LABELS[status]}
                active={filterStatus === status}
                colors={colors}
                onPress={() => setFilterStatus(status)}
              />
            ))}
          </ScrollView>
        </View>

        {history.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="reader-outline" size={30} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No matching records</Text>
            <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
              {filterType !== 'all' || filterStatus !== 'all'
                ? 'Try clearing filters to see more records.'
                : 'Book a service linked to this vehicle to start building your history.'}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/services')}
              style={[styles.emptyCta, { backgroundColor: colors.primary }]}>
              <Text style={styles.emptyCtaText}>Request a service</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.timeline}>
            {history.map((entry, index) => (
              <ServiceRecordCard
                key={entry.id}
                entry={entry}
                colors={colors}
                isLast={index === history.length - 1}
                onOpenRequest={(requestId) => router.push(`/service/track/${requestId}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function FilterChip({
  label,
  active,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  colors: (typeof Colors)['light'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.primary + '14' : colors.card,
          borderColor: active ? colors.primary + '44' : colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <Text style={[styles.chipText, { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '700' : '600' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  introCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 6 },
  introTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  introSub: { fontSize: 13, fontWeight: '500' },
  introHint: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryBox: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 4, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryValueSmall: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.35, textAlign: 'center' },
  filtersSection: { gap: 10 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterTitle: { fontSize: 15, fontWeight: '800' },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 12 },
  timeline: { marginTop: 4 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  emptyCopy: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyCta: { marginTop: 8, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  emptyCtaText: { color: '#fff', fontWeight: '700' },
});
