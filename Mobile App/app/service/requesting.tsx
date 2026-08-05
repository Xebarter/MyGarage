import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { PhoneCaptureDialog } from '@/components/PhoneCaptureDialog';
import { SearchingProviderView } from '@/components/service-request/SearchingProviderView';
import { ServiceMapShell } from '@/components/service-request/ServiceMapShell';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { updateBuyerProfile } from '@/lib/api';
import { isPhoneRequiredServiceError, isValidBuyerPhone } from '@/lib/phone';
import { isValidPoint } from '@/lib/service-request-phase';
import { submitBuyerServiceRequest } from '@/lib/submit-service-request';

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
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const startedRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const customerPhone = profile?.customer.phone ?? '';
  const hasPhone = isValidBuyerPhone(customerPhone);

  const runSubmit = useCallback(async () => {
    if (!profile?.customer.id) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitBuyerServiceRequest({
        customerId: profile.customer.id,
        category,
        service: serviceName,
        location,
        categoryId,
        ...(destination ? { destinationLat: destination.lat, destinationLng: destination.lng } : {}),
      });

      router.replace(`/service/track/${result.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit your request.';
      if (isPhoneRequiredServiceError(message)) {
        startedRef.current = false;
        setPhoneDialogOpen(true);
        return;
      }
      setSubmitError(message);
      startedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [category, categoryId, destination, location, profile?.customer.id, router, serviceName]);

  useEffect(() => {
    if (authLoading || startedRef.current || !isValidPayload) return;
    if (!user || !profile?.customer.id) {
      router.replace('/(auth)/login');
      return;
    }

    if (!hasPhone) {
      setPhoneDialogOpen(true);
      return;
    }

    startedRef.current = true;
    void runSubmit();
  }, [authLoading, hasPhone, isValidPayload, profile?.customer.id, router, runSubmit, user]);

  const handlePhoneSave = async (phone: string) => {
    if (!profile?.customer.id) return;

    setPhoneSaving(true);
    try {
      await updateBuyerProfile(profile.customer.id, { phone });
      await refreshProfile();
      setPhoneDialogOpen(false);
      if (!startedRef.current) {
        startedRef.current = true;
        await runSubmit();
      }
    } finally {
      setPhoneSaving(false);
    }
  };

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

  const handlePhoneDismiss = () => {
    router.replace('/(tabs)/services');
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

  const showSearching = !phoneDialogOpen && submitting;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <PhoneCaptureDialog
        visible={phoneDialogOpen}
        initialPhone={customerPhone}
        title="Add your phone number"
        hint="We need a contact number so your service provider can reach you."
        saveLabel="Save and continue"
        saving={phoneSaving}
        onClose={handlePhoneDismiss}
        onSave={handlePhoneSave}
      />
      {showSearching ? (
        <ServiceMapShell>
          <SearchingProviderView
            serviceName={serviceName}
            location={location}
            destination={destination && isValidPoint(destination) ? destination : null}
            onCancel={handleCancel}
          />
        </ServiceMapShell>
      ) : null}
    </>
  );
}
