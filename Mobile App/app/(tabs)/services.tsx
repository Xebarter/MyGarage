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
import { useRouter } from 'expo-router';
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
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useColorScheme } from '@/components/useColorScheme';
import { userServiceCategories } from '@/data/services-catalog';
import { useServicesGrid } from '@/hooks/useServicesGrid';
import type { ServiceCategory, ServicePriority } from '@/types';

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

function AnimatedCard({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const pageBackground = getServicesPageBackground(scheme);
  const { profile } = useAuth();
  const { itemCount } = useCart();
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ServicePriority | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const { numColumns, cardWidth, horizontalPadding, listKey } = useServicesGrid();

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBackground }]} edges={['top']}>
      <FlatList
        key={listKey}
        style={{ flex: 1, backgroundColor: pageBackground }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
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
              isSearching={isSearching}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              userName={profile?.customer.name}
              locationLabel={profile?.customer.address || profile?.customer.phone}
              cartCount={itemCount}
              onOpenCart={() => router.push('/(tabs)/cart')}
            />
          </View>
        }
        ListEmptyComponent={
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
                <Ionicons name="search-outline" size={26} color={SERVICES_PREMIUM.accent} />
              </View>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No services found</Text>
            <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>
              Try searching for towing, oil change, battery, or insurance.
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setQuery('');
                setPriorityFilter(null);
              }}
              style={({ pressed }) => [
                styles.clearBtn,
                { backgroundColor: SERVICES_PREMIUM.accentDeep, opacity: pressed ? 0.85 : 1 },
              ]}>
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
              <Text style={styles.clearText}>Clear search</Text>
            </Pressable>
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
              <AnimatedCard>
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
    marginBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  empty: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIconOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
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
});
