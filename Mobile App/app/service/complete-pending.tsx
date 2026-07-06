import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { createBuyerServiceRequest, fetchBuyerVehicles } from '@/lib/api';
import {
  clearPendingServiceRequest,
  getActiveServiceRequestId,
  readPendingServiceRequest,
  setActiveServiceRequestId,
} from '@/lib/service-request-storage';

export default function CompletePendingServiceRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, profile, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const run = async () => {
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      const pending = await readPendingServiceRequest();
      if (!pending) {
        router.replace('/(tabs)/services');
        return;
      }

      if (!profile?.customer.id) {
        setError('Your buyer profile is still loading. Please try again.');
        return;
      }

      const existingActiveId = await getActiveServiceRequestId();
      if (existingActiveId) {
        await clearPendingServiceRequest();
        router.replace(`/service/track/${existingActiveId}`);
        return;
      }

      try {
        const vehicles = profile?.customer.id
          ? await fetchBuyerVehicles(profile.customer.id).catch(() => [])
          : [];
        const primaryVehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0];

        const created = await createBuyerServiceRequest({
          customerId: profile.customer.id,
          category: pending.category,
          service: pending.service,
          location: pending.location,
          ...(pending.destinationLat != null && pending.destinationLng != null
            ? { destinationLat: pending.destinationLat, destinationLng: pending.destinationLng }
            : {}),
          ...(primaryVehicle ? { vehicleId: primaryVehicle.id } : {}),
        });

        await clearPendingServiceRequest();
        await setActiveServiceRequestId(created.id);
        router.replace(`/service/track/${created.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not submit your request.');
      }
    };

    void run();
  }, [authLoading, profile?.customer.id, router, user]);

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Request service' }} />
        <EmptyState title="Could not finish request" message={error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Request service', headerShown: false }} />
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Finishing your request</Text>
        <Text style={[styles.copy, { color: colors.textMuted }]}>This only takes a moment.</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  copy: {
    fontSize: 14,
    textAlign: 'center',
  },
});
