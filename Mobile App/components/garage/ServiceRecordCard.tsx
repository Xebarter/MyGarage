import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PROFILE_CARD_SHADOW } from '@/components/profile/profile-ui';
import {
  SERVICE_HISTORY_STATUS_LABELS,
  SERVICE_HISTORY_TYPE_LABELS,
  type ServiceHistoryStatus,
  type ServiceHistoryType,
} from '@/constants/garage';
import Colors from '@/constants/Colors';
import { formatGarageDate, formatGarageDateTime } from '@/lib/garage-format';
import type { VehicleServiceHistoryEntry } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TYPE_ICONS: Record<ServiceHistoryType, IoniconName> = {
  repair: 'build-outline',
  maintenance: 'settings-outline',
  diagnostic: 'pulse-outline',
  inspection: 'search-outline',
  other: 'ellipsis-horizontal-outline',
};

const STATUS_COLORS: Record<ServiceHistoryStatus, { bg: string; text: string; border: string }> = {
  scheduled: { bg: '#3B82F614', text: '#2563EB', border: '#3B82F633' },
  in_progress: { bg: '#F59E0B14', text: '#D97706', border: '#F59E0B33' },
  completed: { bg: '#22C55E14', text: '#16A34A', border: '#22C55E33' },
  cancelled: { bg: '#EF444414', text: '#DC2626', border: '#EF444433' },
};

type Props = {
  entry: VehicleServiceHistoryEntry;
  colors: (typeof Colors)['light'];
  onOpenRequest?: (requestId: string) => void;
  isLast?: boolean;
};

function DetailRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function Milestone({
  label,
  value,
  colors,
  active,
}: {
  label: string;
  value: string | null;
  colors: (typeof Colors)['light'];
  active: boolean;
}) {
  if (!value) return null;
  return (
    <View style={styles.milestone}>
      <View style={[styles.milestoneDot, { backgroundColor: active ? colors.primary : colors.border }]} />
      <View style={styles.milestoneCopy}>
        <Text style={[styles.milestoneLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.milestoneValue, { color: colors.text }]}>{formatGarageDateTime(value)}</Text>
      </View>
    </View>
  );
}

export function ServiceRecordCard({ entry, colors, onOpenRequest, isLast }: Props) {
  const statusStyle = STATUS_COLORS[entry.status];
  const typeIcon = TYPE_ICONS[entry.serviceType];
  const linked = entry.linkedRequest;

  const milestones = linked
    ? [
        { label: 'Requested', value: linked.createdAt, active: true },
        { label: 'Provider accepted', value: linked.acceptedAt, active: Boolean(linked.acceptedAt) },
        { label: 'Provider arrived', value: linked.arrivedAt, active: Boolean(linked.arrivedAt) },
        { label: 'Work started', value: linked.startedAt, active: Boolean(linked.startedAt) },
        { label: 'Completed', value: linked.completedAt, active: Boolean(linked.completedAt) },
      ]
    : [];

  return (
    <View style={styles.wrap}>
      <View style={styles.timelineCol}>
        <View style={[styles.timelineIcon, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
          <Ionicons name={typeIcon} size={16} color={colors.primary} />
        </View>
        {!isLast ? <View style={[styles.timelineLine, { backgroundColor: colors.border }]} /> : null}
      </View>

      <View style={[styles.card, PROFILE_CARD_SHADOW, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.serviceName, { color: colors.text }]}>{entry.serviceName}</Text>
            <Text style={[styles.serviceMeta, { color: colors.textMuted }]}>
              {SERVICE_HISTORY_TYPE_LABELS[entry.serviceType]} · {formatGarageDate(entry.serviceDate)}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
              {SERVICE_HISTORY_STATUS_LABELS[entry.status]}
            </Text>
          </View>
        </View>

        <View style={[styles.detailsBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <DetailRow icon="business-outline" label="Provider" value={entry.providerName || '—'} colors={colors} />
          {linked?.category ? (
            <DetailRow icon="grid-outline" label="Category" value={linked.category} colors={colors} />
          ) : null}
          {linked?.location ? (
            <DetailRow icon="location-outline" label="Location" value={linked.location} colors={colors} />
          ) : null}
          <DetailRow
            icon="calendar-outline"
            label="Service date"
            value={formatGarageDateTime(entry.serviceDate)}
            colors={colors}
          />
          <DetailRow
            icon="document-text-outline"
            label="Record ID"
            value={entry.id.slice(0, 8).toUpperCase()}
            colors={colors}
          />
        </View>

        {milestones.some((m) => m.value) ? (
          <View style={styles.milestonesBlock}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>Service timeline</Text>
            {milestones.map((m) => (
              <Milestone key={m.label} label={m.label} value={m.value} colors={colors} active={m.active} />
            ))}
          </View>
        ) : null}

        {entry.notes?.trim() ? (
          <View style={[styles.notesBlock, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>Provider notes</Text>
            <Text style={[styles.notesText, { color: colors.textMuted }]}>{entry.notes}</Text>
          </View>
        ) : null}

        {entry.serviceRequestId && onOpenRequest ? (
          <Pressable
            onPress={() => onOpenRequest(entry.serviceRequestId!)}
            style={({ pressed }) => [
              styles.requestLink,
              { borderColor: colors.primary + '33', backgroundColor: colors.primary + '10', opacity: pressed ? 0.88 : 1 },
            ]}>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
            <Text style={[styles.requestLinkText, { color: colors.primary }]}>View service request</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 12 },
  timelineCol: { width: 34, alignItems: 'center' },
  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: { flex: 1, width: 2, marginTop: 6, marginBottom: -6, borderRadius: 1 },
  card: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 14, gap: 12, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitleBlock: { flex: 1, gap: 3 },
  serviceName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  serviceMeta: { fontSize: 12, fontWeight: '500' },
  statusPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  detailsBlock: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailLabel: { width: 72, fontSize: 12, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  milestonesBlock: { gap: 8 },
  blockTitle: { fontSize: 13, fontWeight: '800' },
  milestone: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  milestoneDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  milestoneCopy: { flex: 1, gap: 1 },
  milestoneLabel: { fontSize: 11, fontWeight: '600' },
  milestoneValue: { fontSize: 12, fontWeight: '600' },
  notesBlock: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  notesText: { fontSize: 13, lineHeight: 19 },
  requestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
  },
  requestLinkText: { fontSize: 13, fontWeight: '700' },
});
