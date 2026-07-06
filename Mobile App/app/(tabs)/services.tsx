import { useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ServiceCategoryCard } from '@/components/ServiceCategoryCard';
import { ServicesHeader } from '@/components/ServicesHeader';
import Colors from '@/constants/Colors';
import {
  getServicesPageBackground,
  SERVICES_PREMIUM,
  SERVICES_TINT,
} from '@/constants/ServicesPremiumTheme';
import { getPriorityPalette } from '@/constants/ServicePriorities';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { userServiceCategories } from '@/data/services-catalog';
import { useServicesGrid } from '@/hooks/useServicesGrid';
import type { ServiceCategory, ServicePriority } from '@/types';

const SEARCH_SUGGESTIONS = ['towing', 'oil change', 'battery', 'insurance', 'car wash'];

function filterCategories(query: string, priority: ServicePriority | null): ServiceCategory[] {
  const q = query.trim().toLowerCase();

  return userServiceCategories.filter((category) => {
    if (priority && category.priority !== priority) return false;
    if (!q) return true;

    return (
      category.title.toLowerCase().includes(q) ||
      category.useWhen.toLowerCase().includes(q) ||
      category.services.some((service) => service.toLowerCase().includes(q))
    );
  });
}

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const delay = Math.min(index * 45, 360);
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

type GridSectionProps = {
  count: number;
  total: number;
  isFiltered: boolean;
  priorityFilter: ServicePriority | null;
  query: string;
  onClearFilters: () => void;
};

function ServicesGridSection({
  count,
  total,
  isFiltered,
  priorityFilter,
  query,
  onClearFilters,
}: GridSectionProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const priorityLabel = priorityFilter
    ? getPriorityPalette(priorityFilter, scheme).label
    : null;

  return (
    <View style={styles.gridSection}>
      <View style={styles.gridSectionTop}>
        <View style={styles.gridSectionCopy}>
          <Text style={[styles.gridTitle, { color: colors.text }]}>
            {isFiltered ? `${count} results` : 'Categories'}
          </Text>
          {isFiltered ? (
            <Text style={[styles.gridSubtitle, { color: colors.textMuted }]}>
              {count} of {total}
            </Text>
          ) : null}
        </View>
        {isFiltered ? (
          <Pressable
            onPress={onClearFilters}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            style={({ pressed }) => [
              styles.clearFiltersBtn,
              {
                backgroundColor: SERVICES_TINT.clearBg,
                borderColor: SERVICES_TINT.trustBorder,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Ionicons name="close" size={14} color={SERVICES_PREMIUM.accentDeep} />
            <Text style={[styles.clearFiltersText, { color: SERVICES_PREMIUM.accentDeep }]}>
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isFiltered ? (
        <View style={styles.activeFilters}>
          {query.trim() ? (
            <View style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={12} color={SERVICES_PREMIUM.accent} />
              <Text style={[styles.filterChipText, { color: colors.text }]} numberOfLines={1}>
                "{query.trim()}"
              </Text>
            </View>
          ) : null}
          {priorityLabel ? (
            <View
              style={[
                styles.filterChip,
                {
                  backgroundColor: getPriorityPalette(priorityFilter!, scheme).accentMuted,
                  borderColor: getPriorityPalette(priorityFilter!, scheme).accent + '44',
                },
              ]}>
              <View
                style={[
                  styles.filterChipDot,
                  { backgroundColor: getPriorityPalette(priorityFilter!, scheme).accent },
                ]}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: getPriorityPalette(priorityFilter!, scheme).accent },
                ]}>
                {priorityLabel}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ServicesTrustFooter() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View
      style={[
        styles.trustFooter,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}>
      <View style={[styles.trustIcon, { backgroundColor: SERVICES_TINT.trustBg }]}>
        <Ionicons name="shield-checkmark" size={18} color={SERVICES_PREMIUM.accent} />
      </View>
      <View style={styles.trustCopy}>
        <Text style={[styles.trustTitle, { color: colors.text }]}>Verified service partners</Text>
        <Text style={[styles.trustMessage, { color: colors.textMuted }]}>
          Book with confidence — roadside help, repairs, and maintenance near you.
        </Text>
      </View>
    </View>
  );
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const pageBackground = getServicesPageBackground(scheme);
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ServicePriority | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const { numColumns, cardWidth, columnGap, horizontalPadding, listKey } = useServicesGrid();

  const categories = useMemo(
    () => filterCategories(query, priorityFilter),
    [query, priorityFilter],
  );
  const categoryAccentIndex = useMemo(() => {
    const map = new Map<string, number>();
    userServiceCategories.forEach((category, index) => map.set(category.id, index));
    return map;
  }, []);

  const isSearching = query.trim().length > 0;
  const isFiltered = isSearching || priorityFilter !== null;
  const listExtraData = `${query}-${priorityFilter}-${listKey}`;

  const clearFilters = () => {
    setQuery('');
    setPriorityFilter(null);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBackground }]} edges={['top']}>
      <FlatList
        key={listKey}
        style={{ flex: 1, backgroundColor: pageBackground }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        data={categories}
        extraData={listExtraData}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? [styles.row, { gap: columnGap }] : undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <ServicesHeader
              query={query}
              onQueryChange={setQuery}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              locationLabel={profile?.customer.address || profile?.customer.phone}
            />
            {categories.length > 0 ? (
              <ServicesGridSection
                count={categories.length}
                total={userServiceCategories.length}
                isFiltered={isFiltered}
                priorityFilter={priorityFilter}
                query={query}
                onClearFilters={clearFilters}
              />
            ) : null}
          </View>
        }
        ListFooterComponent={categories.length > 0 ? <ServicesTrustFooter /> : null}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  width: screenWidth - horizontalPadding * 2,
                },
              ]}>
              <View style={[styles.emptyIconOuter, { backgroundColor: pageBackground }]}>
                <View style={[styles.emptyIconInner, { backgroundColor: SERVICES_TINT.trustBg }]}>
                  <Ionicons name="search-outline" size={28} color={SERVICES_PREMIUM.accent} />
                </View>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No services found</Text>
              <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>
                We couldn't find a match for your search. Try one of these popular terms:
              </Text>
              <View style={styles.suggestionRow}>
                {SEARCH_SUGGESTIONS.map((term) => (
                  <Pressable
                    key={term}
                    onPress={() => setQuery(term)}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      {
                        backgroundColor: SERVICES_TINT.clearBg,
                        borderColor: SERVICES_TINT.trustBorder,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}>
                    <Text style={[styles.suggestionText, { color: SERVICES_PREMIUM.accentDeep }]}>
                      {term}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={clearFilters}
                style={({ pressed }) => [
                  styles.clearBtn,
                  { backgroundColor: SERVICES_PREMIUM.accentDeep, opacity: pressed ? 0.85 : 1 },
                ]}>
                <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                <Text style={styles.clearText}>Clear all filters</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const isLastOddItem =
            numColumns > 1 && index === categories.length - 1 && categories.length % numColumns !== 0;
          return (
            <View
              style={{
                width: cardWidth,
                flexGrow: 0,
                flexShrink: 0,
                marginRight: isLastOddItem ? 'auto' : 0,
              }}>
              <AnimatedCard index={index}>
                <ServiceCategoryCard
                  category={item}
                  width={cardWidth}
                  accentIndex={categoryAccentIndex.get(item.id) ?? 0}
                />
              </AnimatedCard>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    gap: 4,
  },
  gridSection: {
    marginTop: 20,
    marginBottom: 12,
    gap: 10,
  },
  gridSectionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridSectionCopy: {
    flex: 1,
    gap: 2,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  gridSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '100%',
  },
  filterChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  row: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  emptyWrap: {
    marginTop: 8,
  },
  empty: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  clearBtn: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  trustIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustCopy: {
    flex: 1,
    gap: 3,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  trustMessage: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
