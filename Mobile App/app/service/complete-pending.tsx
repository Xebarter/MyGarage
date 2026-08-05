import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhoneCaptureDialog } from '@/components/PhoneCaptureDialog';
import { EmptyState } from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { updateBuyerProfile } from '@/lib/api';
import { isPhoneRequiredServiceError, isValidBuyerPhone } from '@/lib/phone';
import {
  clearPendingServiceRequest,
  getActiveServiceRequestId,
  readPendingServiceRequest,
} from '@/lib/service-request-storage';
import { submitBuyerServiceRequest } from '@/lib/submit-service-request';

export default function CompletePendingServiceRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);

  const customerPhone = profile?.customer.phone ?? '';
  const hasPhone = isValidBuyerPhone(customerPhone);

  const runSubmit = useCallback(async () => {
    if (!profile?.customer.id) return;

    const pending = await readPendingServiceRequest();
    if (!pending) {
      router.replace('/(tabs)/services');
      return;
    }

    const existingActiveId = await getActiveServiceRequestId();
    if (existingActiveId) {
      await clearPendingServiceRequest();
      router.replace(`/service/track/${existingActiveId}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitBuyerServiceRequest({
        customerId: profile.customer.id,
        category: pending.category,
        service: pending.service,
        location: pending.location,
        categoryId: pending.categoryId,
        ...(pending.destinationLat != null && pending.destinationLng != null
          ? { destinationLat: pending.destinationLat, destinationLng: pending.destinationLng }
          : {}),
      });

      await clearPendingServiceRequest();
      router.replace(`/service/track/${result.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not submit your request.';
      if (isPhoneRequiredServiceError(message)) {
        startedRef.current = false;
        setPhoneDialogOpen(true);
        return;
      }
      setError(message);
      startedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [profile?.customer.id, router]);

  useEffect(() => {
    if (authLoading || startedRef.current) return;

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

      if (!hasPhone) {
        setPhoneDialogOpen(true);
        return;
      }

      startedRef.current = true;
      await runSubmit();
    };

    void run();
  }, [authLoading, hasPhone, profile?.customer.id, router, runSubmit, user]);

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
      <PhoneCaptureDialog
        visible={phoneDialogOpen}
        initialPhone={customerPhone}
        title="Add your phone number"
        hint="We need a contact number so your service provider can reach you."
        saveLabel="Save and continue"
        saving={phoneSaving}
        onClose={() => router.replace('/(tabs)/services')}
        onSave={handlePhoneSave}
      />
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          {submitting ? 'Finishing your request' : 'Preparing your request'}
        </Text>
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
