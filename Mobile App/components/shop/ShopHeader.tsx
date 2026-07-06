import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { SHOP_HEADER, SHOP_PREMIUM } from '@/constants/ShopPremiumTheme';
import { ShopBrowseMenu } from '@/components/shop/ShopBrowseMenu';
import { prefetchAddItemsCategories } from '@/lib/api';

const LOGO = require('@/assets/images/logo-black.png');

const PREMIUM = SHOP_PREMIUM;

type ShopHeaderProps = {
  searchValue: string;
  onChangeSearch: (text: string) => void;
  onSubmitSearch?: () => void;
  onOpenFilters: () => void;
  locationLabel?: string;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  dealsOnly?: boolean;
  onToggleDeals?: () => void;
};

export function ShopHeader({
  searchValue,
  onChangeSearch,
  onSubmitSearch,
  onOpenFilters,
  locationLabel,
  selectedCategory = null,
  onSelectCategory,
  dealsOnly = false,
  onToggleDeals,
}: ShopHeaderProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const accent = Colors[scheme].primary;
  const [browseMenuOpen, setBrowseMenuOpen] = useState(false);

  useEffect(() => {
    void prefetchAddItemsCategories();
  }, []);

  const deliveryLine = locationLabel?.trim() || 'Set delivery address in profile';

  const tools = [
    {
      id: 'categories',
      label: 'Categories',
      icon: 'grid-outline' as const,
      active: false,
      onPress: () => {
        void prefetchAddItemsCategories();
        setBrowseMenuOpen(true);
      },
    },
    {
      id: 'filters',
      label: 'Filters',
      icon: 'options-outline' as const,
      active: false,
      onPress: onOpenFilters,
    },
    {
      id: 'deals',
      label: 'Deals',
      icon: 'pricetag-outline' as const,
      active: dealsOnly,
      onPress: onToggleDeals,
    },
  ];

  return (
    <View style={styles.shellWrap}>
      <LinearGradient
        colors={[SHOP_HEADER.shellTop, SHOP_HEADER.shellBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.shell, { paddingTop: 10 }]}>
        <View style={[styles.glowPrimary, { backgroundColor: SHOP_HEADER.glowPrimary }]} pointerEvents="none" />
        <View style={[styles.glowSecondary, { backgroundColor: SHOP_HEADER.glowSecondary }]} pointerEvents="none" />

      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandName}>MyGarage</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          hitSlop={8}
          style={({ pressed }) => [styles.profileBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open profile">
          <Ionicons name="person-outline" size={20} color={PREMIUM.textMuted} />
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.locationRow, pressed && styles.pressed]}
        onPress={() => router.push('/(tabs)/profile')}
        accessibilityRole="button"
        accessibilityLabel={`Delivery address: ${deliveryLine}`}>
        <Ionicons name="location-outline" size={15} color={PREMIUM.textMuted} />
        <Text style={styles.locationLine} numberOfLines={1}>
          {deliveryLine}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={PREMIUM.textMuted} />
      </Pressable>

      <View style={styles.searchField}>
        <Ionicons name="search-outline" size={18} color={PREMIUM.textMuted} />
        <TextInput
          value={searchValue}
          onChangeText={onChangeSearch}
          placeholder="Search parts and brands"
          placeholderTextColor={PREMIUM.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={onSubmitSearch}
          clearButtonMode="while-editing"
          accessibilityLabel="Search shop"
        />
        {searchValue.length > 0 ? (
          <Pressable
            onPress={() => onChangeSearch('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={PREMIUM.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolsRow}>
        {tools.map((item) => (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.toolPill,
              item.active && { borderColor: accent, backgroundColor: 'rgba(59,130,246,0.12)' },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: item.active }}
            accessibilityLabel={item.label}>
            <Ionicons name={item.icon} size={16} color={item.active ? accent : PREMIUM.text} />
            <Text style={[styles.toolText, item.active && { color: PREMIUM.text, fontWeight: '700' }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ShopBrowseMenu
        visible={browseMenuOpen}
        selectedCategory={selectedCategory}
        onClose={() => setBrowseMenuOpen(false)}
        onSelectCategory={(category) => onSelectCategory?.(category)}
      />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shellWrap: {
    marginHorizontal: -16,
  },
  shell: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  glowPrimary: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  glowSecondary: {
    position: 'absolute',
    top: 24,
    left: -48,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
  },
  brandName: {
    color: PREMIUM.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  pressed: {
    opacity: 0.8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  locationLine: {
    flex: 1,
    color: PREMIUM.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: PREMIUM.text,
    paddingVertical: 0,
    fontWeight: '500',
  },
  toolsRow: {
    gap: 8,
    paddingRight: 4,
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: PREMIUM.bgGlass,
  },
  toolText: {
    color: PREMIUM.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
