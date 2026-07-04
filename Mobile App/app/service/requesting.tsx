import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { SearchingProviderView } from '@/components/service-request/SearchingProviderView';
import { ServiceMapShell } from '@/components/service-request/ServiceMapShell';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { createBuyerServiceRequest, fetchBuyerServiceRequestDetail } from '@/lib/api';
import { isValidPoint } from '@/lib/service-request-phase';
import {
  getActiveServiceRequestId,
  isTerminalServiceRequestStatus,
  setActiveServiceRequestId,
} from '@/lib/service-request-storage';

export default function ServiceRequestingScreen() {
  const params = useLocalSearchParams<{
    categoryId?: string;
    category?: string;
    service?: string;
    location?: string;
    lat?: string;
    lng?: string;
  }>();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const startedRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const serviceName = typeof params.service === 'string' ? params.service : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const location = typeof params.location === 'string' ? params.location : '';
  const categoryId = typeof params.categoryId === 'string' ? params.categoryId : '';

  const destination = useMemo(() => {
    const lat = Number.parseFloat(params.lat ?? '');
    const lng = Number.parseFloat(params.lng ?? '');
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return null;
  }, [params.lat, params.lng]);

  const isValidPayload =
    Boolean(categoryId && category && serviceName && location.trim().length >= 3);

  useEffect(() => {
    if (authLoading || startedRef.current || !isValidPayload) return;
    if (!user || !profile?.customer.id) {
      router.replace('/(auth)/login');
      return;
    }

    startedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const existingActiveId = await getActiveServiceRequestId();
        if (existingActiveId) {
          try {
            const existing = await fetchBuyerServiceRequestDetail(
              existingActiveId,
              profile.customer.id,
            );
            if (!isTerminalServiceRequestStatus(existing.request.status)) {
              if (!cancelled) router.replace(`/service/track/${existingActiveId}`);
              return;
            }
          } catch {
            // Continue with a new request if the previous active id is stale.
          }
        }

        const created = await createBuyerServiceRequest({
          customerId: profile.customer.id,
          category,
          service: serviceName,
          location: location.trim(),
          ...(destination ? { destinationLat: destination.lat, destinationLng: destination.lng } : {}),
        });

        if (cancelled) return;
        await setActiveServiceRequestId(created.id);
        router.replace(`/service/track/${created.id}`);
      } catch (error) {
        if (cancelled) return;
        setSubmitError(
          error instanceof Error ? error.message : 'Could not submit your request.',
        );
        startedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    category,
    destination,
    isValidPayload,
    location,
    profile?.customer.id,
    router,
    serviceName,
    user,
  ]);

  const handleCancel = () => {
    Alert.alert('Cancel request?', 'You can request another service anytime.', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Go back',
        style: 'destructive',
        onPress: () => router.replace('/(tabs)/services'),
      },
    ]);
  };

  if (!isValidPayload) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          title="Missing details"
          message="Go back and choose your service location again."
        />
      </>
    );
  }

  if (submitError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState title="Request failed" message={submitError} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ServiceMapShell>
        <SearchingProviderView
          serviceName={serviceName}
          location={location}
          destination={destination && isValidPoint(destination) ? destination : null}
          onCancel={handleCancel}
        />
      </ServiceMapShell>
    </>
  );
}
