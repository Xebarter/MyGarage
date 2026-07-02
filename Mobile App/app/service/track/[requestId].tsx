import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, LayoutAnimation } from 'react-native';

import { ProviderTrackingView } from '@/components/service-request/ProviderTrackingView';
import { SearchingProviderView } from '@/components/service-request/SearchingProviderView';
import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceRequestDetail } from '@/hooks/useServiceRequestDetail';
import {
  estimateDistanceKm,
  getServiceRequestUiPhase,
  isTrackingPhase,
  isValidPoint,
} from '@/lib/service-request-phase';
import {
  clearActiveServiceRequestId,
  isTerminalServiceRequestStatus,
  setActiveServiceRequestId,
} from '@/lib/service-request-storage';

export default function ServiceTrackScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const customerId = profile?.customer.id ?? '';
  const prevPhaseRef = useRef<string | null>(null);

  const { data, loading, error, reload } = useServiceRequestDetail({
    requestId: requestId ?? '',
    customerId,
    pollMs: 2500,
  });

  useEffect(() => {
    if (!requestId) return;
    void setActiveServiceRequestId(requestId);
  }, [requestId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    const request = data?.request;
    if (!request) return;
    if (isTerminalServiceRequestStatus(request.status)) {
      void clearActiveServiceRequestId();
    }
  }, [data?.request]);

  const phase = useMemo(() => {
    if (!data?.request) return 'searching' as const;
    const destination = isValidPoint({
      lat: data.request.destinationLat ?? null,
      lng: data.request.destinationLng ?? null,
    })
      ? { lat: data.request.destinationLat!, lng: data.request.destinationLng! }
      : null;
    const provider = isValidPoint({
      lat: data.request.providerLat ?? null,
      lng: data.request.providerLng ?? null,
    })
      ? { lat: data.request.providerLat!, lng: data.request.providerLng! }
      : null;
    const distanceKm =
      destination && provider ? estimateDistanceKm(provider, destination) : null;
    return getServiceRequestUiPhase(data.request, { providerDistanceKm: distanceKm });
  }, [data?.request]);

  useEffect(() => {
    if (prevPhaseRef.current === 'searching' && isTrackingPhase(phase)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      void reload();
    }
    prevPhaseRef.current = phase;
  }, [phase, reload]);

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel request?', 'You can request another service anytime.', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearActiveServiceRequestId();
            router.replace('/(tabs)/services');
          })();
        },
      },
    ]);
  }, [router]);

  const handleDone = useCallback(() => {
    router.replace('/(tabs)/services');
  }, [router]);

  if (authLoading || (!data && loading)) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <LoadingView label="Loading your request" />
      </>
    );
  }

  if (!requestId || error || !data?.request) {
    return (
      <>
        <Stack.Screen options={{ title: 'Service request' }} />
        <EmptyState
          title="Request unavailable"
          message={error ?? 'This service request could not be found.'}
        />
      </>
    );
  }

  const isSearching = phase === 'searching';

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: !isSearching }} />
      {isSearching ? (
        <SearchingProviderView
          serviceName={data.request.service}
          location={data.request.location}
          onCancel={handleCancel}
        />
      ) : (
        <ProviderTrackingView
          request={data.request}
          provider={data.providerContact}
          phase={phase}
          requestId={requestId}
          onCancel={handleCancel}
          onDone={handleDone}
        />
      )}
    </>
  );
}
