import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ServiceRequestSearchingMap } from '@/components/service-request/ServiceRequestSearchingMap';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useResolvedMapDestination } from '@/hooks/useResolvedMapDestination';
import { SEARCH_STATUS_MESSAGES, type GeoPoint } from '@/lib/service-request-phase';

type SearchingProviderViewProps = {
  serviceName: string;
  location: string;
  destination: GeoPoint | null;
  onCancel: () => void;
};

export function SearchingProviderView({
  serviceName,
  location,
  destination,
  onCancel,
}: SearchingProviderViewProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const sheetHeight = Math.min(windowHeight * 0.44, 380);
  const mapPaddingBottom = sheetHeight + insets.bottom + 12;
  const [messageIndex, setMessageIndex] = useState(0);
  const shimmer = useState(() => new Animated.Value(0))[0];
  const { destination: mapDestination, loading: resolvingMap } = useResolvedMapDestination(
    destination,
    location,
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((current) => (current + 1) % SEARCH_STATUS_MESSAGES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 280],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.mapLayer}>
        <ServiceRequestSearchingMap
          destination={mapDestination}
          accentColor={colors.primary}
          loading={resolvingMap}
          mapPaddingBottom={mapPaddingBottom}
        />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={[styles.scanBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.scanBadgePulse}>
            <View style={[styles.scanBadgeDot, { backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.scanBadgeText, { color: colors.text }]}>Finding nearby providers</Text>
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={[styles.sheetWrap, { paddingBottom: insets.bottom + 8 }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.headline, { color: colors.text }]}>Finding the best provider...</Text>
          <Text style={[styles.subline, { color: colors.textMuted }]}>
            {SEARCH_STATUS_MESSAGES[messageIndex]}
          </Text>

          <View style={[styles.metaCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.metaRow}>
              <Ionicons name="construct" size={18} color={colors.primary} />
              <Text style={[styles.metaTitle, { color: colors.text }]} numberOfLines={1}>
                {serviceName}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <Text style={[styles.metaLocation, { color: colors.textMuted }]} numberOfLines={2}>
                {location}
              </Text>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.progressShimmer,
                { backgroundColor: colors.primary + '33', transform: [{ translateX: shimmerTranslate }] },
              ]}
            />
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: '42%' }]} />
          </View>
          <Text style={[styles.eta, { color: colors.textMuted }]}>Usually takes 15–30 seconds</Text>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelBtn,
              { borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
            ]}>
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel request</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  scanBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  scanBadgePulse: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  scanBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scanBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    paddingHorizontal: 12,
    maxHeight: '46%',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.55)',
    marginBottom: 4,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subline: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 40,
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  metaLocation: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
    borderRadius: 999,
    opacity: 0.9,
  },
  eta: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
