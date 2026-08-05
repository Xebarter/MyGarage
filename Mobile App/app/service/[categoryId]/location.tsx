import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAddressSuggestions } from '@/hooks/useAddressSuggestions';
import { useServiceLocation } from '@/hooks/useServiceLocation';
import { canResolveSuggestion, getAddressSuggestionIcon } from '@/lib/addressSuggestions';
import {
  fetchAddressPlaceDetails,
  type AddressSuggestion,
} from '@/lib/api';
import { formatServiceCategoryTitle } from '@/lib/format';
import { savePendingServiceRequest } from '@/lib/service-request-storage';

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
  const { user, profile, configured } = useAuth();

  const category = categoryId ? getServiceCategoryById(categoryId) : undefined;
  const isValidService =
    category && serviceName && category.services.some((item) => item.name === serviceName);

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
    selectManualAddress,
    detectCurrentLocation,
    refreshBiasOrigin,
    resolvedLocation,
    coords,
    biasOrigin,
    canSubmitLocation,
  } = useServiceLocation();

  const [addressFocused, setAddressFocused] = useState(false);
  const [placesSessionToken, setPlacesSessionToken] = useState(() => Crypto.randomUUID());
  const [resolvingSuggestionId, setResolvingSuggestionId] = useState<string | null>(null);

  const refreshPlacesSession = useCallback(() => {
    setPlacesSessionToken(Crypto.randomUUID());
  }, []);

  const showAddressSuggestions = !useDetectedLocation && addressFocused;
  const suggestionOrigin = biasOrigin ?? coords ?? undefined;
  const { suggestions, loading: suggestionsLoading } = useAddressSuggestions(
    manualLocation,
    showAddressSuggestions,
    {
      sessionToken: placesSessionToken,
      origin: suggestionOrigin,
      limit: 8,
    },
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const autoNavigatedRef = useRef(false);
  const suggestionScrollRef = useRef(false);
  const suggestionScrollResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSuggestionScrollStart = useCallback(() => {
    if (suggestionScrollResetTimer.current) {
      clearTimeout(suggestionScrollResetTimer.current);
      suggestionScrollResetTimer.current = null;
    }
    suggestionScrollRef.current = true;
  }, []);

  const markSuggestionScrollEnd = useCallback(() => {
    if (suggestionScrollResetTimer.current) {
      clearTimeout(suggestionScrollResetTimer.current);
    }
    suggestionScrollResetTimer.current = setTimeout(() => {
      suggestionScrollRef.current = false;
      suggestionScrollResetTimer.current = null;
    }, 160);
  }, []);

  useEffect(() => {
    return () => {
      if (suggestionScrollResetTimer.current) {
        clearTimeout(suggestionScrollResetTimer.current);
      }
    };
  }, []);

  const navigateToRequesting = useCallback(
    (locationLabel: string, point?: { lat: number; lng: number } | null) => {
      if (autoNavigatedRef.current || !category || !serviceName) return;
      autoNavigatedRef.current = true;

      if (!user || !profile?.customer.id) {
        if (!configured) {
          autoNavigatedRef.current = false;
          setSubmitError(
            'Sign-in is not set up in this APK. Set production env vars on expo.dev, then rebuild: eas build -p android --profile preview.',
          );
          return;
        }

        void savePendingServiceRequest({
          categoryId: category.id,
          category: category.title,
          service: serviceName,
          location: locationLabel,
          ...(point ? { destinationLat: point.lat, destinationLng: point.lng } : {}),
        }).then(() => router.push('/(auth)/login'));
        return;
      }

      router.replace({
        pathname: '/service/requesting',
        params: {
          categoryId: category.id,
          category: category.title,
          service: serviceName,
          location: locationLabel,
          ...(point
            ? { lat: String(point.lat), lng: String(point.lng) }
            : biasOrigin
              ? { lat: String(biasOrigin.lat), lng: String(biasOrigin.lng) }
              : {}),
        },
      });
    },
    [biasOrigin, category, configured, profile?.customer.id, router, serviceName, user],
  );

  const handleSelectSuggestion = async (item: AddressSuggestion) => {
    if (!canResolveSuggestion(item)) return;
    if (suggestionScrollRef.current) return;

    setAddressFocused(false);
    setResolvingSuggestionId(item.id);

    try {
      let finalLabel = item.label;
      let finalCoords: { lat: number; lng: number } | null =
        item.lat != null && item.lng != null ? { lat: item.lat, lng: item.lng } : null;

      if (item.placeId) {
        const place = await fetchAddressPlaceDetails(item.placeId, placesSessionToken);
        finalLabel = place.label;
        finalCoords = { lat: place.lat, lng: place.lng };
        selectManualAddress(place.label, place.lat, place.lng);
      } else if (finalCoords) {
        selectManualAddress(item.label, finalCoords.lat, finalCoords.lng);
      }
      refreshPlacesSession();
      navigateToRequesting(finalLabel, finalCoords);
    } catch {
      if (item.lat != null && item.lng != null) {
        selectManualAddress(item.label, item.lat, item.lng);
        refreshPlacesSession();
        navigateToRequesting(item.label, { lat: item.lat, lng: item.lng });
      }
    } finally {
      setResolvingSuggestionId(null);
    }
  };

  if (!category || !isValidService || !theme) {
    return <EmptyState title="Service not found" message="Go back and choose a service again." />;
  }

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!canSubmitLocation || !resolvedLocation) return;
    navigateToRequesting(resolvedLocation, coords);
  };

  const enableGpsMode = useCallback(() => {
    setSubmitError(null);
    setUseDetectedLocation(true);
    void detectCurrentLocation();
  }, [detectCurrentLocation, setUseDetectedLocation]);

  const showSuggestionList =
    showAddressSuggestions && manualLocation.trim().length >= 2 && !suggestionsLoading && suggestions.length > 0;
  const lockParentScroll = showSuggestionList;

  return (
    <>
      <Stack.Screen options={{ title: 'Confirm location' }} />
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps={showSuggestionList ? 'always' : 'handled'}
          scrollEnabled={!lockParentScroll}
          nestedScrollEnabled
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
            <Pressable
              onPress={enableGpsMode}
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
              <View style={styles.inputWrap}>
                <TextInput
                  value={manualLocation}
                  onChangeText={setManualLocation}
                  onFocus={() => {
                    setAddressFocused(true);
                    refreshPlacesSession();
                    void refreshBiasOrigin(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setAddressFocused(false), 200);
                  }}
                  placeholder="Search for a building, street, or area"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="search"
                  editable={!resolvingSuggestionId}
                />
                {resolvingSuggestionId ? (
                  <View style={styles.inputSpinner}>
                    <ActivityIndicator size="small" color={theme.accent} />
                  </View>
                ) : null}
              </View>
              {showAddressSuggestions && manualLocation.trim().length >= 2 ? (
                <View
                  style={[
                    styles.suggestions,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}>
                  {suggestionsLoading ? (
                    <View style={styles.suggestionLoading}>
                      <ActivityIndicator size="small" color={theme.accent} />
                      <Text style={[styles.suggestionLoadingText, { color: colors.textMuted }]}>
                        Searching nearby places...
                      </Text>
                    </View>
                  ) : suggestions.length > 0 ? (
                    <ScrollView
                      keyboardShouldPersistTaps="always"
                      nestedScrollEnabled
                      style={styles.suggestionsList}
                      showsVerticalScrollIndicator
                      onScrollBeginDrag={markSuggestionScrollStart}
                      onScrollEndDrag={markSuggestionScrollEnd}
                      onMomentumScrollEnd={markSuggestionScrollEnd}>
                      {suggestions.map((item, index) => {
                        const resolving = resolvingSuggestionId === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            delayPressIn={120}
                            onPress={() => {
                              void handleSelectSuggestion(item);
                            }}
                            disabled={Boolean(resolvingSuggestionId)}
                            style={({ pressed }) => [
                              styles.suggestionItem,
                              index < suggestions.length - 1 && {
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: colors.border,
                              },
                              pressed && { backgroundColor: colors.card },
                            ]}>
                            <View
                              style={[
                                styles.suggestionIconWrap,
                                { backgroundColor: theme.accent + '14' },
                              ]}>
                              <Ionicons
                                name={getAddressSuggestionIcon(item.types)}
                                size={18}
                                color={theme.accent}
                              />
                            </View>
                            <View style={styles.suggestionCopy}>
                              <Text
                                style={[styles.suggestionTitle, { color: colors.text }]}
                                numberOfLines={1}>
                                {item.title}
                              </Text>
                              {item.subtitle ? (
                                <Text
                                  style={[styles.suggestionSubtitle, { color: colors.textMuted }]}
                                  numberOfLines={1}>
                                  {item.subtitle}
                                </Text>
                              ) : null}
                            </View>
                            {resolving ? (
                              <ActivityIndicator size="small" color={theme.accent} />
                            ) : (
                              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={[styles.suggestionEmpty, { color: colors.textMuted }]}>
                      No places found. Try a nearby landmark or street name.
                    </Text>
                  )}
                </View>
              ) : null}
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
            disabled={!canSubmitLocation}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: canSubmitLocation ? theme.accent : colors.border,
                opacity: pressed && canSubmitLocation ? 0.92 : 1,
              },
            ]}>
            <View style={styles.submitBtnContent}>
              <Ionicons name="arrow-forward" size={17} color={theme.onAccent} />
              <Text style={[styles.submitText, { color: theme.onAccent }]}>Continue</Text>
            </View>
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
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 42,
    fontSize: 15,
    lineHeight: 22,
  },
  inputWrap: {
    position: 'relative',
  },
  inputSpinner: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  suggestions: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 280,
  },
  suggestionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  suggestionLoadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  suggestionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  suggestionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  suggestionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  suggestionEmpty: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
