import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ServiceLocationMap } from '@/components/ServiceLocationMap';
import Colors from '@/constants/Colors';
import { getCategoryTheme } from '@/constants/ServiceCategoryThemes';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { getServiceCategoryById } from '@/data/services-catalog';
import { useServiceLocation } from '@/hooks/useServiceLocation';
import { createBuyerServiceRequest, fetchBuyerServiceRequestDetail } from '@/lib/api';
import { formatServiceCategoryTitle } from '@/lib/format';
import {
  getActiveServiceRequestId,
  isTerminalServiceRequestStatus,
  savePendingServiceRequest,
  setActiveServiceRequestId,
} from '@/lib/service-request-storage';

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});

function StepIndicator({ activeStep }: { activeStep: 2 | 1 }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.steps} accessibilityRole="progressbar">
      <View style={styles.stepItem}>
        <View style={[styles.stepDot, styles.stepDotDone]}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
        <Text style={[styles.stepLabelDone, { color: colors.success }]}>Service</Text>
      </View>
      <View style={[styles.stepLineDone, { backgroundColor: colors.success + '55' }]} />
      <View style={styles.stepItem}>
        <View
          style={[
            styles.stepDot,
            activeStep === 2 && { backgroundColor: colors.primary },
          ]}>
          <Text
            style={[
              styles.stepNumber,
              { color: colors.textMuted },
              activeStep === 2 && styles.stepNumberActive,
            ]}>
            2
          </Text>
        </View>
        <Text
          style={[
            styles.stepLabel,
            { color: colors.textMuted },
            activeStep === 2 && { color: colors.text, fontWeight: '700' },
          ]}>
          Location
        </Text>
      </View>
    </View>
  );
}

export default function ServiceLocationScreen() {
  const { categoryId, service: serviceParam } = useLocalSearchParams<{
    categoryId: string;
    service?: string;
  }>();
  const serviceName = typeof serviceParam === 'string' ? serviceParam : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, profile } = useAuth();

  const category = categoryId ? getServiceCategoryById(categoryId) : undefined;
  const isValidService =
    category && serviceName && category.services.some((item) => item === serviceName);

  const theme = category ? getCategoryTheme(category.id, scheme) : null;
  const categoryTitle = category ? formatServiceCategoryTitle(category.title) : '';

  const {
    useDetectedLocation,
    setUseDetectedLocation,
    locationStatus,
    locationMessage,
    locationAccuracyLabel,
    placeLabel,
    manualLocation,
    setManualLocation,
    detectCurrentLocation,
    resolvedLocation,
    coords,
    canSubmitLocation,
  } = useServiceLocation();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!category || !isValidService || !theme) {
    return <EmptyState title="Service not found" message="Go back and choose a service again." />;
  }

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!canSubmitLocation || !resolvedLocation) return;

    if (!user || !profile?.customer.id) {
      await savePendingServiceRequest({
        categoryId: category.id,
        category: category.title,
        service: serviceName,
        location: resolvedLocation,
        ...(coords ? { destinationLat: coords.lat, destinationLng: coords.lng } : {}),
      });
      router.push('/(auth)/login');
      return;
    }

    const existingActiveId = await getActiveServiceRequestId();
    if (existingActiveId) {
      try {
        const existing = await fetchBuyerServiceRequestDetail(existingActiveId, profile.customer.id);
        if (!isTerminalServiceRequestStatus(existing.request.status)) {
          router.replace(`/service/track/${existingActiveId}`);
          return;
        }
      } catch {
        // Continue with a new request if the previous active id is stale.
      }
    }

    setSubmitting(true);
    try {
      const created = await createBuyerServiceRequest({
        customerId: profile.customer.id,
        category: category.title,
        service: serviceName,
        location: resolvedLocation,
        ...(coords ? { destinationLat: coords.lat, destinationLng: coords.lng } : {}),
      });

      await setActiveServiceRequestId(created.id);
      router.replace(`/service/track/${created.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Confirm location' }} />
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <StepIndicator activeStep={2} />

          <View
            style={[
              styles.serviceSummary,
              CARD_SHADOW,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}>
            <View style={[styles.serviceAccent, { backgroundColor: theme.accent }]} />
            <View style={styles.serviceSummaryBody}>
              <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={2}>
                {serviceName}
              </Text>
              <Text style={[styles.serviceCategory, { color: colors.textMuted }]} numberOfLines={1}>
                {categoryTitle}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Where should we meet you?</Text>

          <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              onPress={() => setUseDetectedLocation(true)}
              style={[
                styles.segmentBtn,
                useDetectedLocation && [
                  styles.segmentBtnActive,
                  { backgroundColor: colors.background, borderColor: theme.accent + '44' },
                ],
              ]}>
              <Ionicons
                name="navigate"
                size={18}
                color={useDetectedLocation ? theme.accent : colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: useDetectedLocation ? colors.text : colors.textMuted },
                ]}>
                Use GPS
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setUseDetectedLocation(false)}
              style={[
                styles.segmentBtn,
                !useDetectedLocation && [
                  styles.segmentBtnActive,
                  { backgroundColor: colors.background, borderColor: theme.accent + '44' },
                ],
              ]}>
              <Ionicons
                name="create-outline"
                size={18}
                color={!useDetectedLocation ? theme.accent : colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: !useDetectedLocation ? colors.text : colors.textMuted },
                ]}>
                Type address
              </Text>
            </Pressable>
          </View>

          {useDetectedLocation ? (
            <ServiceLocationMap
              coords={coords}
              placeLabel={placeLabel}
              accentColor={theme.accent}
              locationStatus={locationStatus}
              locationMessage={locationMessage}
              locationAccuracyLabel={locationAccuracyLabel}
              onRefresh={() => void detectCurrentLocation()}
            />
          ) : (
            <View
              style={[
                styles.panel,
                CARD_SHADOW,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Area or address</Text>
              <TextInput
                value={manualLocation}
                onChangeText={setManualLocation}
                placeholder="e.g. Ntinda, near Capital Shoppers"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            CARD_SHADOW,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}>
          {!user ? (
            <Text style={[styles.footerHint, { color: colors.textMuted }]}>
              Sign in to submit and track your request
            </Text>
          ) : null}
          {submitError ? (
            <Text style={styles.errorText} accessibilityRole="alert">
              {submitError}
            </Text>
          ) : null}
          {!canSubmitLocation ? (
            <Text style={[styles.footerHint, { color: colors.textMuted }]}>
              {useDetectedLocation
                ? 'Allow location access or refresh GPS, or switch to type your address.'
                : 'Enter your area or address to continue.'}
            </Text>
          ) : null}
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={!canSubmitLocation || submitting}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: canSubmitLocation ? theme.accent : colors.border,
                opacity: pressed && canSubmitLocation ? 0.92 : 1,
              },
            ]}>
            {submitting ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <View style={styles.submitBtnContent}>
                <Ionicons name="send" size={17} color={theme.onAccent} />
                <Text style={[styles.submitText, { color: theme.onAccent }]}>Request Service</Text>
                <Ionicons name="arrow-forward" size={17} color={theme.onAccent} />
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  stepDotDone: {
    backgroundColor: '#10B981',
  },
  stepDotActive: {
    backgroundColor: '#3B82F6',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepLabelDone: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepLineDone: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    minWidth: 24,
  },
  serviceSummary: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  serviceAccent: {
    width: 4,
  },
  serviceSummaryBody: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  serviceCategory: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentBtnActive: {
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  footerHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#DC2626',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
