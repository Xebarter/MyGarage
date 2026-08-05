import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import { ServiceRecordCard } from '@/components/garage/ServiceRecordCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import { VEHICLE_STATUS_LABELS } from '@/constants/garage';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchVehicleGarageDetail } from '@/lib/api';
import {
  formatGarageDate,
  isServiceDueSoon,
  isServiceOverdue,
  statusTone,
  vehicleSubtitle,
  vehicleTitle,
} from '@/lib/garage-format';
import type { BuyerVehicle, VehicleServiceHistoryEntry } from '@/types';

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

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setError(null);
    try {
      const detail = await fetchVehicleGarageDetail(id, { sortBy: 'date', sortOrder: 'desc' });
      setVehicle(detail.vehicle);
      setHistory(detail.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load vehicle.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const title = useMemo(() => (vehicle ? vehicleTitle(vehicle) : 'Vehicle'), [vehicle]);
  const previewHistory = history.slice(0, 2);

  const openRecords = () => {
    if (!vehicle) return;
    router.push(`/garage/${vehicle.id}/records`);
  };

  if (loading) return <LoadingView label="Loading vehicle" />;
  if (error || !vehicle) {
    return (
      <>
        <Stack.Screen options={{ title: 'Vehicle' }} />
        <EmptyState title="Unavailable" message={error ?? 'Vehicle not found.'} />
      </>
    );
  }

  const tone = statusTone(vehicle.vehicleStatus);
  const statusColor =
    tone === 'active' ? colors.primary : tone === 'success' ? colors.success : colors.textMuted;
  const dueSoon = isServiceDueSoon(vehicle.nextServiceDate);
  const overdue = isServiceOverdue(vehicle.nextServiceDate);

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, backgroundColor: colors.background },
        ]}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroImage, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {vehicle.imageUrl ? (
              <Image source={{ uri: vehicle.imageUrl }} style={styles.heroImageFill} />
            ) : (
              <Ionicons name="car-sport" size={48} color={colors.textMuted} />
            )}
          </View>

          <View style={styles.heroHeader}>
            <View style={styles.heroTitleRow}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
              {vehicle.isPrimary ? (
                <View style={styles.primaryBadge}>
                  <Ionicons name="star" size={12} color="#D97706" />
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.heroSub, { color: colors.textMuted }]}>{vehicleSubtitle(vehicle)}</Text>
          </View>

          <View style={[styles.statusBanner, { backgroundColor: statusColor + '12', borderColor: statusColor + '30' }]}>
            <Ionicons name="information-circle-outline" size={18} color={statusColor} />
            <View style={styles.statusBannerCopy}>
              <Text style={[styles.statusBannerTitle, { color: statusColor }]}>
                {VEHICLE_STATUS_LABELS[vehicle.vehicleStatus]}
              </Text>
              <Text style={[styles.statusBannerHint, { color: colors.textMuted }]}>
                {vehicle.statusUpdatedAt
                  ? `Updated ${formatGarageDate(vehicle.statusUpdatedAt)} by your provider`
                  : 'Status updates appear when your provider works on this vehicle'}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Next service</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: overdue ? colors.destructive : dueSoon ? '#D97706' : colors.text,
                  },
                ]}>
                {formatGarageDate(vehicle.nextServiceDate)}
              </Text>
              {vehicle.nextServiceDate ? (
                <Text style={[styles.statHint, { color: colors.textMuted }]}>
                  {overdue ? 'Overdue' : dueSoon ? 'Due within 30 days' : 'Scheduled maintenance'}
                </Text>
              ) : (
                <Text style={[styles.statHint, { color: colors.textMuted }]}>Not scheduled</Text>
              )}
            </View>

            <Pressable
              onPress={openRecords}
              style={({ pressed }) => [
                styles.statBox,
                styles.statBoxTappable,
                { borderColor: colors.primary + '33', backgroundColor: colors.primary + '08', opacity: pressed ? 0.92 : 1 },
              ]}>
              <View style={styles.statBoxTop}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Service records</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{history.length}</Text>
              <Text style={[styles.statHint, { color: colors.primary }]}>View full history</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.push({ pathname: '/garage/add', params: { id: vehicle.id } })}
              style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit vehicle</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/services')}
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Ionicons name="construct-outline" size={18} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Book service</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent service</Text>
          {history.length > 0 ? (
            <Pressable onPress={openRecords} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>View all</Text>
            </Pressable>
          ) : null}
        </View>

        {history.length === 0 ? (
          <View style={[styles.emptyHistory, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="time-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyHistoryTitle, { color: colors.text }]}>No service records yet</Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
              Book a service and link it to this vehicle to build your maintenance timeline.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/services')}
              style={[styles.emptyHistoryCta, { backgroundColor: colors.primary }]}>
              <Text style={styles.emptyHistoryCtaText}>Request a service</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {previewHistory.map((entry, index) => (
              <ServiceRecordCard
                key={entry.id}
                entry={entry}
                colors={colors}
                isLast={index === previewHistory.length - 1}
                onOpenRequest={(requestId) => router.push(`/service/track/${requestId}`)}
              />
            ))}
            {history.length > previewHistory.length ? (
              <Pressable
                onPress={openRecords}
                style={({ pressed }) => [
                  styles.viewAllBtn,
                  { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 },
                ]}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  View all {history.length} service records
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  heroCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  heroImage: {
    height: 168,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImageFill: { width: '100%', height: '100%' },
  heroHeader: { gap: 4 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  heroSub: { fontSize: 14, fontWeight: '500' },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B18',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  primaryBadgeText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  statusBanner: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'flex-start',
  },
  statusBannerCopy: { flex: 1, gap: 2 },
  statusBannerTitle: { fontSize: 14, fontWeight: '800' },
  statusBannerHint: { fontSize: 12, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  statBoxTappable: {},
  statBoxTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 15, fontWeight: '800' },
  statHint: { fontSize: 10, lineHeight: 14 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  emptyHistory: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyHistoryTitle: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  emptyHistoryCta: { marginTop: 8, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  emptyHistoryCtaText: { color: '#fff', fontWeight: '700' },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: -4,
  },
  viewAllText: { fontSize: 14, fontWeight: '700' },
});
