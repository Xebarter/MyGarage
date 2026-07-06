import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import type { BuyerVehicle } from '@/types';

function vehicleTitle(vehicle: BuyerVehicle) {
  if (vehicle.nickname?.trim()) return vehicle.nickname.trim();
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

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
      setError(err instanceof Error ? err.message : 'Could not load your garage.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.customer.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => void load(true), 15000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading) return <LoadingView label="Loading My Garage" />;

  if (!profile?.customer.id) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Garage' }} />
        <EmptyState title="Sign in required" message="Sign in to manage your vehicles and service history." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Garage' }} />
        <EmptyState title="Garage unavailable" message={error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Garage',
          headerRight: () => (
            <Pressable onPress={() => router.push('/garage/add')} hitSlop={8} style={{ marginRight: 4 }}>
              <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} />}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, backgroundColor: colors.background },
          vehicles.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={
          <EmptyState
            title="No vehicles yet"
            message="Add your first car to track service history and provider updates."
          />
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/garage/[id]', params: { id: item.id } }} asChild>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.94 : 1 },
              ]}>
              <View style={styles.cardRow}>
                <View style={[styles.thumb, { backgroundColor: colors.border }]}>
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
                    {item.isPrimary ? <Ionicons name="star" size={14} color="#F59E0B" /> : null}
                  </View>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.licensePlate || 'No plate'} · {item.make} {item.model}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: colors.primary + '14' }]}>
                    <Text style={[styles.statusText, { color: colors.primary }]}>
                      {VEHICLE_STATUS_LABELS[item.vehicleStatus]}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          </Link>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  subtitle: { fontSize: 12 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
