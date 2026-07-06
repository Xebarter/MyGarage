import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import { VEHICLE_STATUS_LABELS } from '@/constants/garage';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchBuyerVehicles } from '@/lib/api';
import {
  formatGarageDate,
  isServiceDueSoon,
  isServiceOverdue,
  statusTone,
  vehicleSubtitle,
  vehicleTitle,
} from '@/lib/garage-format';
import type { BuyerVehicle } from '@/types';

export default function GarageListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<BuyerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!profile?.customer.id) {
      setVehicles([]);
      setLoading(false);
      return;
    }
    if (!silent) setError(null);
    try {
      const data = await fetchBuyerVehicles(profile.customer.id);
      setVehicles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your vehicles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.customer.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const summary = useMemo(() => {
    const inShop = vehicles.filter(
      (v) => v.vehicleStatus === 'in_service' || v.vehicleStatus === 'awaiting_parts',
    ).length;
    const dueSoon = vehicles.filter((v) => isServiceDueSoon(v.nextServiceDate)).length;
    const primary = vehicles.find((v) => v.isPrimary);
    return { total: vehicles.length, inShop, dueSoon, primary };
  }, [vehicles]);

  if (loading) return <LoadingView label="Loading My Vehicles" />;

  if (!profile?.customer.id) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Vehicles' }} />
        <View style={[styles.authWrap, { backgroundColor: colors.background }]}>
          <EmptyState
            title="Sign in required"
            message="Sign in to add vehicles, track provider status, and view service history."
          />
          <Link href="/(auth)/login" asChild>
            <Pressable style={[styles.summaryAddBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.summaryAddBtnText}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Vehicles' }} />
        <View style={[styles.errorWrap, { backgroundColor: colors.background }]}>
          <EmptyState title="Could not load vehicles" message={error} />
          <Pressable
            onPress={() => void load()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Vehicles',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/garage/add')}
              hitSlop={8}
              style={({ pressed }) => [{ marginRight: 4, opacity: pressed ? 0.8 : 1 }]}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
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
          { paddingBottom: insets.bottom + 96, backgroundColor: colors.background },
          vehicles.length === 0 && styles.emptyContent,
        ]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryTop}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.primary + '14' }]}>
                  <Ionicons name="car-sport" size={22} color={colors.primary} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>Your garage</Text>
                  <Text style={[styles.summaryHint, { color: colors.textMuted }]}>
                    {summary.total === 0
                      ? 'Add a vehicle to link services and track history.'
                      : summary.primary
                        ? `Primary: ${vehicleTitle(summary.primary)}`
                        : `${summary.total} vehicle${summary.total === 1 ? '' : 's'} on file`}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryStats}>
                <SummaryStat label="Vehicles" value={String(summary.total)} colors={colors} />
                <SummaryStat label="In shop" value={String(summary.inShop)} colors={colors} accent={summary.inShop > 0} />
                <SummaryStat label="Due soon" value={String(summary.dueSoon)} colors={colors} accent={summary.dueSoon > 0} />
              </View>
              <Pressable
                onPress={() => router.push('/garage/add')}
                style={({ pressed }) => [
                  styles.summaryAddBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
                ]}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.summaryAddBtnText}>
                  {summary.total === 0 ? 'Add your first vehicle' : 'Add another vehicle'}
                </Text>
              </Pressable>
            </View>
            {vehicles.length > 0 ? (
              <Text style={[styles.listHeading, { color: colors.textMuted }]}>All vehicles</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="car-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No vehicles yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>
              Add your car to track service history, provider status updates, and upcoming maintenance.
            </Text>
            <Pressable
              onPress={() => router.push('/garage/add')}
              style={[styles.emptyCta, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyCtaText}>Add your first vehicle</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <VehicleCard item={item} colors={colors} />}
      />

      <Pressable
        onPress={() => router.push('/garage/add')}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 24,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Add vehicle</Text>
      </Pressable>
    </>
  );
}

function SummaryStat({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
  accent?: boolean;
}) {
  return (
    <View style={[styles.summaryStat, { borderColor: colors.border }]}>
      <Text style={[styles.summaryStatValue, { color: accent ? colors.primary : colors.text }]}>{value}</Text>
      <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function VehicleCard({
  item,
  colors,
}: {
  item: BuyerVehicle;
  colors: (typeof Colors)['light'];
}) {
  const tone = statusTone(item.vehicleStatus);
  const statusColor =
    tone === 'active' ? colors.primary : tone === 'success' ? colors.success : colors.textMuted;
  const dueSoon = isServiceDueSoon(item.nextServiceDate);
  const overdue = isServiceOverdue(item.nextServiceDate);

  return (
    <Link href={{ pathname: '/garage/[id]', params: { id: item.id } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.94 : 1 },
        ]}>
        <View style={styles.cardRow}>
          <View style={[styles.thumb, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumbImage} />
            ) : (
              <Ionicons name="car-sport-outline" size={28} color={colors.textMuted} />
            )}
          </View>
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {vehicleTitle(item)}
              </Text>
              {item.isPrimary ? (
                <View style={[styles.primaryBadge, { backgroundColor: '#F59E0B18' }]}>
                  <Ionicons name="star" size={11} color="#D97706" />
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {vehicleSubtitle(item)}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {VEHICLE_STATUS_LABELS[item.vehicleStatus]}
                </Text>
              </View>
              {item.nextServiceDate ? (
                <Text
                  style={[
                    styles.dueText,
                    {
                      color: overdue ? colors.destructive : dueSoon ? '#D97706' : colors.textMuted,
                    },
                  ]}>
                  Service {overdue ? 'overdue' : dueSoon ? 'due soon' : ''}{' '}
                  {formatGarageDate(item.nextServiceDate)}
                </Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  emptyContent: { flexGrow: 1 },
  authWrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  errorWrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  retryBtn: { alignSelf: 'center', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  headerBlock: { gap: 12, marginBottom: 4 },
  summaryCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: { flex: 1, gap: 3 },
  summaryTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  summaryHint: { fontSize: 13, lineHeight: 18 },
  summaryStats: { flexDirection: 'row', gap: 8 },
  summaryStat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  summaryStatValue: { fontSize: 18, fontWeight: '800' },
  summaryStatLabel: { fontSize: 11, fontWeight: '600' },
  summaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  summaryAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  listHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  emptyBlock: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 24, gap: 10 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyMessage: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyCta: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  cardBody: { flex: 1, minWidth: 0, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  primaryBadgeText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  subtitle: { fontSize: 12, fontWeight: '500' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  dueText: { fontSize: 11, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
