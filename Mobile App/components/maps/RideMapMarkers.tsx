import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { PICKUP_PIN_COLOR, PROVIDER_PIN_COLOR } from '@/lib/mapStyles';

type PickupPinMarkerProps = {
  accentColor?: string;
};

/** Customer pickup pin — dark cap, stem, ground dot (Uber-style). */
export function PickupPinMarker({ accentColor = PICKUP_PIN_COLOR }: PickupPinMarkerProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.45] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.45, 0.2, 0] });

  return (
    <View style={styles.pickupWrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.pickupPulse,
          {
            borderColor: accentColor,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <View style={[styles.pickupHead, { backgroundColor: accentColor }]}>
        <View style={styles.pickupInner}>
          <Ionicons name="person" size={14} color={accentColor} />
        </View>
      </View>
      <View style={[styles.pickupStem, { backgroundColor: accentColor }]} />
      <View style={[styles.pickupDot, { backgroundColor: accentColor }]} />
    </View>
  );
}

type ProviderVehicleMarkerProps = {
  color?: string;
};

/** Provider vehicle badge with soft halo. */
export function ProviderVehicleMarker({ color = PROVIDER_PIN_COLOR }: ProviderVehicleMarkerProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.08] });

  return (
    <View style={styles.providerWrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.providerHalo,
          {
            backgroundColor: color + '33',
            borderColor: color + '66',
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <View style={styles.providerBadge}>
        <View style={[styles.providerIcon, { backgroundColor: color }]}>
          <Ionicons name="car-sport" size={17} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pickupWrap: {
    width: 56,
    height: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pickupPulse: {
    position: 'absolute',
    bottom: 2,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  pickupHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
    }),
  },
  pickupInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupStem: {
    width: 3,
    height: 14,
    marginTop: -1,
    borderRadius: 2,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  providerWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerHalo: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
  },
  providerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: { elevation: 10 },
    }),
  },
  providerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
