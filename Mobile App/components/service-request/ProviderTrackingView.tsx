import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggableBottomSheet } from '@/components/service-request/DraggableBottomSheet';
import { LiveTrackingMap } from '@/components/service-request/LiveTrackingMap';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  canCancelServiceRequest,
  estimateDistanceKm,
  estimateEtaMinutes,
  formatDistanceLabel,
  isValidPoint,
  phaseDescription,
  phaseHeadline,
  type GeoPoint,
} from '@/lib/service-request-phase';
import type { BuyerServiceRequestDetail, ServiceProviderContact, ServiceRequestUiPhase } from '@/types';

type ProviderTrackingViewProps = {
  request: BuyerServiceRequestDetail;
  provider: ServiceProviderContact | null;
  phase: ServiceRequestUiPhase;
  requestId: string;
  onCancel?: () => void;
  onDone: () => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MG';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProviderTrackingView({
  request,
  provider,
  phase,
  requestId,
  onCancel,
  onDone,
}: ProviderTrackingViewProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const fade = useRef(new Animated.Value(1)).current;
  const statusPulse = useRef(new Animated.Value(0)).current;
  const [simulatedProvider, setSimulatedProvider] = useState<GeoPoint | null>(null);
  const prevPhaseRef = useRef(phase);

  const destination = useMemo((): GeoPoint | null => {
    if (isValidPoint({ lat: request.destinationLat ?? null, lng: request.destinationLng ?? null })) {
      return { lat: request.destinationLat!, lng: request.destinationLng! };
    }
    return null;
  }, [request.destinationLat, request.destinationLng]);

  const liveProvider = useMemo((): GeoPoint | null => {
    if (isValidPoint({ lat: request.providerLat ?? null, lng: request.providerLng ?? null })) {
      return { lat: request.providerLat!, lng: request.providerLng! };
    }
    return simulatedProvider;
  }, [request.providerLat, request.providerLng, simulatedProvider]);

  const showRoute =
    phase === 'en_route' ||
    phase === 'nearby' ||
    phase === 'provider_accepted' ||
    phase === 'preparing_to_depart' ||
    phase === 'provider_found';

  useEffect(() => {
    if (!destination || liveProvider || phase === 'completed' || phase === 'cancelled') return;
    if (!showRoute) return;
    setSimulatedProvider({
      lat: destination.lat + 0.018,
      lng: destination.lng + 0.014,
    });
  }, [destination, liveProvider, phase, showRoute]);

  useEffect(() => {
    if (!destination || !simulatedProvider || request.providerLat != null) return;
    if (!showRoute) return;

    const timer = setInterval(() => {
      setSimulatedProvider((current) => {
        if (!current || !destination) return current;
        return {
          lat: current.lat + (destination.lat - current.lat) * 0.07,
          lng: current.lng + (destination.lng - current.lng) * 0.07,
        };
      });
    }, 1600);

    return () => clearInterval(timer);
  }, [destination, request.providerLat, showRoute, simulatedProvider]);

  useEffect(() => {
    if (prevPhaseRef.current === phase) return;
    fade.setValue(0.72);
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    prevPhaseRef.current = phase;
  }, [fade, phase]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(statusPulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [statusPulse]);

  const distanceKm =
    destination && liveProvider ? estimateDistanceKm(liveProvider, destination) : null;
  const etaMinutes = distanceKm != null ? estimateEtaMinutes(distanceKm) : null;
  const rating =
    provider?.rating != null && provider.rating > 0 ? provider.rating.toFixed(1) : '4.9';
  const completedJobs = provider?.completedJobs ?? 0;
  const businessName = provider?.businessName ?? provider?.name ?? 'MyGarage provider';
  const vehicleLabel = provider?.vehicleLabel ?? 'Service vehicle';

  const openPhone = () => {
    if (!provider?.phone) return;
    void Linking.openURL(`tel:${provider.phone.replace(/\D/g, '')}`);
  };

  const openChat = () => {
    if (!provider?.phone) return;
    void Linking.openURL(`sms:${provider.phone.replace(/\D/g, '')}`);
  };

  const shareTrip = () => {
    void Share.share({
      message: `Track my MyGarage ${request.service} service (ref ${requestId.slice(0, 8).toUpperCase()}). Provider: ${businessName}. Status: ${phaseHeadline(phase)}.`,
    });
  };

  const statusDotScale = statusPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const statusDotOpacity = statusPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LiveTrackingMap
        destination={destination}
        providerTarget={liveProvider}
        etaMinutes={etaMinutes}
        distanceKm={distanceKm}
        statusLabel={phaseHeadline(phase)}
        showRoute={showRoute}
        topInset={insets.top + 44}
      />

      <DraggableBottomSheet backgroundColor={colors.card} borderColor={colors.border} expandedHeight={500}>
        <Animated.View style={{ opacity: fade, gap: 12, paddingBottom: 8 }}>
          <View style={styles.statusRow}>
            <Animated.View
              style={[
                styles.liveDot,
                {
                  backgroundColor: colors.success,
                  opacity: statusDotOpacity,
                  transform: [{ scale: statusDotScale }],
                },
              ]}
            />
            <View style={styles.statusCopy}>
              <Text style={[styles.phaseTitle, { color: colors.text }]}>{phaseHeadline(phase)}</Text>
              <Text style={[styles.phaseCopy, { color: colors.textMuted }]}>{phaseDescription(phase)}</Text>
            </View>
          </View>

          {etaMinutes != null && distanceKm != null ? (
            <View style={[styles.metricsRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Metric label="ETA" value={`${etaMinutes} min`} colors={colors} />
              <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
              <Metric label="Distance" value={formatDistanceLabel(distanceKm)} colors={colors} />
              <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
              <Metric label="Service" value={request.service} colors={colors} compact />
            </View>
          ) : null}

          {provider ? (
            <View style={[styles.providerCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initials(provider.name)}</Text>
              </View>
              <View style={styles.providerCopy}>
                <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
                  {businessName}
                </Text>
                <Text style={[styles.mechanicName, { color: colors.textMuted }]} numberOfLines={1}>
                  {provider.name}
                </Text>
                <Text style={[styles.metaLine, { color: colors.text }]}>
                  ⭐ {rating}
                  {completedJobs > 0 ? ` · ${completedJobs.toLocaleString()} jobs` : ' · Verified'}
                </Text>
                <Text style={[styles.vehicleLine, { color: colors.textMuted }]} numberOfLines={1}>
                  {vehicleLabel}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.actionsGrid}>
            <ActionChip icon="call" label="Call" onPress={openPhone} disabled={!provider?.phone} colors={colors} primary />
            <ActionChip icon="chatbubble-ellipses" label="Chat" onPress={openChat} disabled={!provider?.phone} colors={colors} />
            <ActionChip icon="share-social" label="Share" onPress={shareTrip} colors={colors} />
          </View>

          {canCancelServiceRequest(phase) && onCancel ? (
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
              ]}>
              <Text style={[styles.cancelText, { color: colors.destructive }]}>Cancel request</Text>
            </Pressable>
          ) : null}

          {phase === 'completed' || phase === 'cancelled' ? (
            <Pressable
              onPress={onDone}
              style={({ pressed }) => [
                styles.doneBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
              ]}>
              <Text style={styles.doneBtnText}>Back to services</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </DraggableBottomSheet>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.liveBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.liveBadgeDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.liveBadgeText, { color: colors.text }]}>Live tracking</Text>
        </View>
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  colors,
  compact,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
  compact?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[styles.metricValue, { color: colors.text }, compact && styles.metricValueCompact]}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  disabled,
  colors,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  colors: (typeof Colors)['light'];
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionChip,
        primary
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
        { opacity: disabled ? 0.45 : pressed ? 0.9 : 1 },
      ]}>
      <Ionicons name={icon} size={17} color={primary ? '#FFFFFF' : colors.text} />
      <Text style={[styles.actionChipText, { color: primary ? '#FFFFFF' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  liveBadgeText: { fontSize: 12, fontWeight: '800' },
  statusRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  liveDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  statusCopy: { flex: 1, gap: 4 },
  phaseTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  phaseCopy: { fontSize: 14, lineHeight: 20 },
  metricsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  metric: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  metricLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  metricValue: { fontSize: 15, fontWeight: '800' },
  metricValueCompact: { fontSize: 12 },
  metricDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  providerCard: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  providerCopy: { flex: 1, gap: 3 },
  businessName: { fontSize: 16, fontWeight: '800' },
  mechanicName: { fontSize: 13, fontWeight: '600' },
  metaLine: { fontSize: 13, fontWeight: '600' },
  vehicleLine: { fontSize: 12, fontWeight: '500' },
  actionsGrid: { flexDirection: 'row', gap: 8 },
  actionChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionChipText: { fontSize: 13, fontWeight: '700' },
  cancelBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700' },
  doneBtn: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
