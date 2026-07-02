import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { getServiceCategoryMeta } from '@/constants/ServiceCategoryMeta';
import { getCategoryTheme } from '@/constants/ServiceCategoryThemes';
import { getPriorityPalette } from '@/constants/ServicePriorities';
import { useColorScheme } from '@/components/useColorScheme';
import { getServiceCategoryById } from '@/data/services-catalog';
import { formatServiceCategoryTitle, formatServiceHint } from '@/lib/format';
const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});

export default function ServiceCategoryScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const category = categoryId ? getServiceCategoryById(categoryId) : undefined;

  if (!category) {
    return <EmptyState title="Service category not found" />;
  }

  const theme = getCategoryTheme(category.id, scheme);
  const meta = getServiceCategoryMeta(category.id);
  const priority = getPriorityPalette(category.priority, scheme);
  const title = formatServiceCategoryTitle(category.title);
  const hint = formatServiceHint(category.useWhen);
  const serviceCount = category.services.length;

  const openServiceLocation = (service: string) => {
    router.push({
      pathname: '/service/[categoryId]/location',
      params: { categoryId: category.id, service },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.hero,
              {
                backgroundColor: theme.accentMuted,
                borderColor: theme.accent + '44',
              },
            ]}>
            <View style={[styles.heroAccent, { backgroundColor: theme.accent }]} />
            <View style={styles.heroBody}>
              <View style={styles.heroTop}>
                <View
                  style={[
                    styles.heroIcon,
                    { backgroundColor: colors.card, borderColor: theme.accent + '55' },
                  ]}>
                  <Text style={styles.heroEmoji}>{category.emoji}</Text>
                </View>
                <View style={styles.heroTitleBlock}>
                  <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: colors.card + 'CC', borderColor: priority.accent + '44' },
                    ]}>
                    <View style={[styles.priorityDot, { backgroundColor: priority.accent }]} />
                    <Text style={[styles.priorityText, { color: priority.accent }]}>
                      {priority.label}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.heroHint, { color: colors.textMuted }]}>{hint}</Text>
              <View style={[styles.heroMetaChip, { backgroundColor: colors.card + 'CC' }]}>
                <Ionicons name={meta.icon} size={14} color={theme.accent} />
                <Text style={[styles.heroMetaText, { color: colors.textMuted }]}>
                  {serviceCount} services available
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Available options</Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              Tap a service to set your location
            </Text>
          </View>

          <View style={styles.optionGrid}>
            {category.services.map((service, index) => (
              <Pressable
                key={service}
                accessibilityRole="button"
                onPress={() => openServiceLocation(service)}
                style={({ pressed }) => [
                  styles.optionCard,
                  CARD_SHADOW,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.94 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}>
                <View style={[styles.optionAccent, { backgroundColor: theme.accent }]} />
                <View
                  style={[
                    styles.optionIndex,
                    { backgroundColor: theme.accentMuted, borderColor: theme.accent + '35' },
                  ]}>
                  <Text style={[styles.optionIndexText, { color: theme.accent }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>{service}</Text>
                <View
                  style={[
                    styles.optionChevron,
                    { backgroundColor: theme.accentMuted, borderColor: theme.accent + '35' },
                  ]}>
                  <Ionicons name="chevron-forward" size={14} color={theme.accent} />
                </View>
              </Pressable>
            ))}
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
    gap: 14,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  heroAccent: {
    height: 4,
  },
  heroBody: {
    padding: 16,
    gap: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroEmoji: {
    fontSize: 28,
  },
  heroTitleBlock: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  heroHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroMetaChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 2,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionGrid: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    paddingRight: 14,
    paddingLeft: 0,
    overflow: 'hidden',
  },
  optionAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  optionIndex: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionIndexText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  optionChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});