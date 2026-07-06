import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { VEHICLE_STATUS_LABELS } from '@/constants/garage';
import Colors from '@/constants/Colors';
import { vehicleSubtitle, vehicleTitle } from '@/lib/garage-format';
import type { BuyerVehicle } from '@/types';

type Props = {
  colors: (typeof Colors)['light'];
  vehicles: BuyerVehicle[];
  onAdd: () => void;
  onOpenAll?: () => void;
  /** Max vehicles to show before truncating (profile hub). */
  limit?: number;
  showAddButton?: boolean;
};

function statusTone(status: BuyerVehicle['vehicleStatus'], colors: (typeof Colors)['light']) {
  switch (status) {
    case 'in_service':
      return { bg: colors.primary + '18', text: colors.primary };
    case 'awaiting_parts':
      return { bg: '#F59E0B22', text: '#D97706' };
    case 'ready_for_pickup':
      return { bg: colors.success + '22', text: colors.success };
    default:
      return { bg: colors.background, text: colors.textMuted };
  }
}

export function VehiclesTab({
  colors,
  vehicles,
  onAdd,
  onOpenAll,
  limit,
  showAddButton = true,
}: Props) {
  const router = useRouter();
  const visible = limit ? vehicles.slice(0, limit) : vehicles;
  const hiddenCount = limit ? Math.max(0, vehicles.length - limit) : 0;

  return (
    <View style={styles.wrap}>
      {showAddButton ? (
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [
            styles.addBtn,
            { borderColor: colors.primary, backgroundColor: colors.primary + '10', opacity: pressed ? 0.9 : 1 },
          ]}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={[styles.addBtnText, { color: colors.primary }]}>Add vehicle</Text>
        </Pressable>
      ) : null}

      {vehicles.length === 0 ? (
        <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="car-sport-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No vehicles in your garage</Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Add your car to track services, documents, and provider updates.
          </Text>
          <Pressable
            onPress={onAdd}
            style={({ pressed }) => [
              styles.emptyCta,
              { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
            ]}>
            <Text style={styles.emptyCtaText}>Add your first vehicle</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {visible.map((vehicle) => {
            const tone = statusTone(vehicle.vehicleStatus, colors);
            return (
              <Pressable
                key={vehicle.id}
                onPress={() => router.push({ pathname: '/garage/[id]', params: { id: vehicle.id } })}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.94 : 1 },
                ]}>
                <View style={[styles.thumb, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  {vehicle.imageUrl ? (
                    <Image source={{ uri: vehicle.imageUrl }} style={styles.thumbImage} />
                  ) : (
                    <Ionicons name="car-sport-outline" size={24} color={colors.textMuted} />
                  )}
                </View>
                <View style={styles.cardCopy}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                      {vehicleTitle(vehicle)}
                    </Text>
                    {vehicle.isPrimary ? (
                      <View style={[styles.primaryPill, { backgroundColor: '#F59E0B18' }]}>
                        <Ionicons name="star" size={10} color="#D97706" />
                        <Text style={styles.primaryPillText}>Primary</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {vehicleSubtitle(vehicle)}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusText, { color: tone.text }]}>
                      {VEHICLE_STATUS_LABELS[vehicle.vehicleStatus]}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            );
          })}
          {hiddenCount > 0 && onOpenAll ? (
            <Pressable
              onPress={onOpenAll}
              style={({ pressed }) => [
                styles.moreRow,
                { borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
              ]}>
              <Text style={[styles.moreText, { color: colors.primary }]}>
                View {hiddenCount} more vehicle{hiddenCount === 1 ? '' : 's'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 10 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 14, fontWeight: '800' },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyHint: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280 },
  emptyCta: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyCtaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  cardCopy: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, flexShrink: 1 },
  primaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  primaryPillText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  subtitle: { fontSize: 12, fontWeight: '500' },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    borderStyle: 'dashed',
  },
  moreText: { fontSize: 13, fontWeight: '700' },
});
