import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { SEARCH_STATUS_MESSAGES } from '@/lib/service-request-phase';

type SearchingProviderViewProps = {
  serviceName: string;
  location: string;
  onCancel: () => void;
};

export function SearchingProviderView({ serviceName, location, onCancel }: SearchingProviderViewProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const progressLoop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    );
    pulseLoop.start();
    progressLoop.start();
    return () => {
      pulseLoop.stop();
      progressLoop.stop();
    };
  }, [progress, pulse]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((current) => (current + 1) % SEARCH_STATUS_MESSAGES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['18%', '92%'] });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.hero}>
        <View style={styles.iconStage}>
          <Animated.View
            style={[
              styles.pulseRing,
              { borderColor: colors.primary + '55', opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
          <View style={[styles.iconCore, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
            <Ionicons name="car-sport" size={42} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.headline, { color: colors.text }]}>Finding the best service provider...</Text>
        <Text style={[styles.subline, { color: colors.textMuted }]}>{SEARCH_STATUS_MESSAGES[messageIndex]}</Text>
        <Text style={[styles.serviceLine, { color: colors.text }]} numberOfLines={1}>
          {serviceName}
        </Text>
        <Text style={[styles.locationLine, { color: colors.textMuted }]} numberOfLines={2}>
          {location}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Searching nearby verified mechanics</Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary, width: progressWidth }]} />
        </View>
        <Text style={[styles.eta, { color: colors.textMuted }]}>Estimated wait: 15–30 seconds</Text>
        <Text style={[styles.autoNote, { color: colors.textMuted }]}>
          Live tracking starts automatically when a provider accepts.
        </Text>
      </View>

      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [
          styles.cancelBtn,
          { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.88 : 1 },
        ]}>
        <Text style={[styles.cancelText, { color: colors.text }]}>Cancel request</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 28,
  },
  iconStage: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
  },
  iconCore: {
    width: 96,
    height: 96,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
    paddingHorizontal: 8,
  },
  subline: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  serviceLine: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
  },
  locationLine: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  eta: {
    fontSize: 13,
    fontWeight: '600',
  },
  autoNote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
