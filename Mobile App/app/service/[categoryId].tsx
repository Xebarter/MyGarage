import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { getServiceCategoryMeta } from '@/constants/ServiceCategoryMeta';
import {
  getServicesPageBackground,
  SERVICES_PREMIUM,
  SERVICES_TINT,
} from '@/constants/ServicesPremiumTheme';
import { getPriorityPalette } from '@/constants/ServicePriorities';
import { useColorScheme } from '@/components/useColorScheme';
import { getServiceCategoryById } from '@/data/services-catalog';
import { fetchServicePriceRanges, type ServicePriceRangeDto } from '@/lib/api';
import { formatServiceCategoryTitle, formatServiceHint } from '@/lib/format';
import { formatServicePriceRangeLabel } from '@/lib/format-service-price';

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#042F2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
});

export default function ServiceCategoryScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const pageBackground = getServicesPageBackground(scheme);

  const category = categoryId ? getServiceCategoryById(categoryId) : undefined;
  const [ranges, setRanges] = useState<ServicePriceRangeDto[]>([]);
  const [rangesLoading, setRangesLoading] = useState(false);

  useEffect(() => {
    if (!category?.id) {
      setRanges([]);
      return;
    }
    let cancelled = false;
    setRangesLoading(true);
    void fetchServicePriceRanges(category.id)
      .then((rows) => {
        if (!cancelled) setRanges(rows);
      })
      .catch(() => {
        if (!cancelled) setRanges([]);
      })
      .finally(() => {
        if (!cancelled) setRangesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category?.id]);

  const rangeByName = useMemo(
    () => new Map(ranges.map((r) => [r.serviceName, r] as const)),
    [ranges],
  );

  if (!category) {
    return <EmptyState title="Service category not found" />;
  }

  const meta = getServiceCategoryMeta(category.id);
  const priority = getPriorityPalette(category.priority, scheme);
  const title = formatServiceCategoryTitle(category.title);
  const hint = formatServiceHint(category.useWhen);
  const serviceCount = category.services.length;
  const accent = scheme === 'dark' ? SERVICES_PREMIUM.accent : SERVICES_PREMIUM.accentDeep;

  const openServiceLocation = (service: string) => {
    router.push({
      pathname: '/service/[categoryId]/location',
      params: { categoryId: category.id, service },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={[styles.screen, { backgroundColor: pageBackground }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.hero,
              CARD_SHADOW,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}>
            <View style={styles.heroMain}>
              <View style={[styles.heroIcon, { backgroundColor: SERVICES_TINT.iconBg }]}>
                <Text style={styles.heroEmoji}>{category.emoji}</Text>
              </View>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.heroHint, { color: colors.textMuted }]}>{hint}</Text>
              </View>
            </View>

            <View style={[styles.heroMeta, { borderTopColor: colors.border }]}>
              <View style={styles.heroMetaItem}>
                <Ionicons name={meta.icon} size={15} color={accent} />
                <Text style={[styles.heroMetaText, { color: colors.textMuted }]}>
                  {serviceCount} {serviceCount === 1 ? 'option' : 'options'}
                </Text>
              </View>
              <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.heroMetaText, { color: colors.textMuted }]}>
                {priority.label} priority
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose a service</Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              Prices show the range from providers listing each service
            </Text>
          </View>

          <View style={styles.optionGrid}>
            {category.services.map((service) => {
              const priceLabel = rangesLoading
                ? 'Loading price…'
                : formatServicePriceRangeLabel(rangeByName.get(service.name));
              return (
                <Pressable
                  key={service.name}
                  accessibilityRole="button"
                  onPress={() => openServiceLocation(service.name)}
                  style={({ pressed }) => [
                    styles.optionCard,
                    CARD_SHADOW,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    },
                  ]}>
                  <View style={[styles.optionIcon, { backgroundColor: SERVICES_TINT.trustBg }]}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={accent} />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionLabel, { color: colors.text }]} numberOfLines={2}>
                      {service.name}
                    </Text>
                    <Text style={[styles.optionPrice, { color: colors.textMuted }]} numberOfLines={1}>
                      {priceLabel}
                    </Text>
                  </View>
                  <View style={[styles.optionChevron, { backgroundColor: SERVICES_TINT.clearBg }]}>
                    <Ionicons name="chevron-forward" size={16} color={accent} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
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
  hero: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroEmoji: {
    fontSize: 26,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingTop: 2,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.35,
  },
  heroHint: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 12,
  },
  sectionHeader: {
    paddingHorizontal: 2,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionGrid: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  optionLabel: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  optionPrice: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  optionChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
