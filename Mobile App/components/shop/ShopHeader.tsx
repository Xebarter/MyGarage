import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { ShopBrowseMenu } from '@/components/shop/ShopBrowseMenu';
import { prefetchAddItemsCategories } from '@/lib/api';

const LOGO = require('@/assets/images/logo-black.png');

const PREMIUM = {
  bg: '#0B1220',
  bgElevated: '#121C2E',
  bgGlass: 'rgba(255,255,255,0.06)',
  borderGlass: 'rgba(255,255,255,0.12)',
  borderGlow: 'rgba(59,130,246,0.45)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  accent: '#3B82F6',
  accentSoft: '#60A5FA',
  gold: '#FBBF24',
};

type ShopHeaderProps = {
  searchValue: string;
  onChangeSearch: (text: string) => void;
  onSubmitSearch?: () => void;
  onOpenCart: () => void;
  onOpenFilters: () => void;
  cartCount: number;
  locationLabel?: string;
  userName?: string;
  resultCount?: number;
  sortLabel?: string;
  categories?: string[];
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  dealsOnly?: boolean;
  onToggleDeals?: () => void;
};

export function ShopHeader({
  searchValue,
  onChangeSearch,
  onSubmitSearch,
  onOpenCart,
  onOpenFilters,
  cartCount,
  locationLabel,
  userName,
  resultCount,
  sortLabel = 'Featured',
  categories = [],
  selectedCategory = null,
  onSelectCategory,
  dealsOnly = false,
  onToggleDeals,
}: ShopHeaderProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const brandPrimary = Colors[scheme].primary;
  const [browseMenuOpen, setBrowseMenuOpen] = useState(false);

  useEffect(() => {
    void prefetchAddItemsCategories();
  }, []);

  const openBrowseMenu = () => {
    void prefetchAddItemsCategories();
    setBrowseMenuOpen(true);
  };

  const deliveryLine = locationLabel?.trim() || 'Set your delivery address';
  const greetingName = userName?.trim().split(' ')[0] || 'Guest';

  const quickLinks: Array<{
    id: string;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    active?: boolean;
  }> = [
    { id: 'filters', label: 'Filters', icon: 'options-outline', onPress: onOpenFilters },
    { id: 'sort', label: sortLabel, icon: 'swap-vertical-outline', onPress: onOpenFilters },
    { id: 'deals', label: 'Deals', icon: 'pricetag-outline', onPress: onToggleDeals, active: dealsOnly },
    ...categories.slice(0, 6).map((category) => ({
      id: `cat-${category}`,
      label: category,
      onPress: () => onSelectCategory?.(category),
      active: selectedCategory === category,
    })),
  ];

  return (
    <View style={[styles.shell, { paddingTop: 10 }]}>
      <View style={styles.ambientGlowTop} pointerEvents="none" />
      <View style={styles.ambientGlowAccent} pointerEvents="none" />

      <View style={styles.topRow}>
        <View style={styles.brandBlock}>
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandName}>MyGarage</Text>
          </View>
        </View>

        <View style={styles.iconRow}>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            style={({ pressed }) => [styles.iconChip, pressed && styles.iconChipPressed]}>
            <Ionicons name="person-outline" size={20} color={PREMIUM.text} />
            <Text style={styles.iconLabel}>{greetingName}</Text>
          </Pressable>
          <Pressable
            onPress={onOpenCart}
            style={({ pressed }) => [styles.iconChip, pressed && styles.iconChipPressed]}>
            <View>
              <Ionicons name="cart-outline" size={20} color={PREMIUM.text} />
              {cartCount > 0 ? (
                <View style={[styles.cartBadge, { backgroundColor: brandPrimary }]}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.iconLabel}>Cart</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.deliveryCard, pressed && styles.deliveryCardPressed]}
        onPress={() => router.push('/(tabs)/profile')}>
        <View style={styles.deliveryIconWrap}>
          <Ionicons name="navigate" size={14} color={PREMIUM.gold} />
        </View>
        <View style={styles.deliveryCopy}>
          <Text style={styles.deliveryKicker}>Deliver to</Text>
          <Text style={styles.deliveryLine} numberOfLines={1}>
            <Text style={styles.deliveryStrong}>{greetingName}</Text>
            {'  ·  '}
            {deliveryLine}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={PREMIUM.textMuted} />
      </Pressable>

      <View style={styles.searchShell}>
        <View style={styles.searchField}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={searchValue}
            onChangeText={onChangeSearch}
            placeholder="Search parts, brands, categories…"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={onSubmitSearch}
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable
          onPress={onSubmitSearch}
          style={({ pressed }) => [
            styles.searchBtn,
            { backgroundColor: brandPrimary, opacity: pressed ? 0.88 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Search">
          <Ionicons name="search" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.trustRow}>
        <TrustPill icon="shield-checkmark-outline" label="Verified" />
        <TrustPill icon="flash-outline" label="Fast delivery" />
        <TrustPill icon="lock-closed-outline" label="Secure pay" />
      </View>

      <FlatList
        horizontal
        data={quickLinks}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickNav}
        renderItem={({ item }) => {
          const active = Boolean(item.active);
          return (
            <Pressable
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.quickPill,
                active && [styles.quickPillActive, { borderColor: brandPrimary }],
                pressed && styles.quickPillPressed,
              ]}>
              {item.icon ? (
                <Ionicons name={item.icon} size={13} color={active ? brandPrimary : PREMIUM.textMuted} />
              ) : null}
              <Text
                style={[styles.quickPillText, active && { color: brandPrimary, fontWeight: '800' }]}
                numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.headerFooter}>
        <Pressable
          onPress={openBrowseMenu}
          style={({ pressed }) => [styles.categoriesBtn, pressed && styles.categoriesBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open categories menu">
          <View style={styles.categoriesIcon}>
            <Ionicons name="menu" size={18} color={PREMIUM.text} />
          </View>
          <Text style={styles.categoriesText} numberOfLines={1}>
            Categories
          </Text>
        </Pressable>
        <View style={[styles.resultsBadge, { borderColor: PREMIUM.borderGlass }]}>
          <Text style={styles.resultsCount}>{resultCount ?? 0}</Text>
          <Text style={styles.resultsHint}>items</Text>
        </View>
      </View>

      <ShopBrowseMenu
        visible={browseMenuOpen}
        selectedCategory={selectedCategory}
        onClose={() => setBrowseMenuOpen(false)}
        onSelectCategory={(category) => onSelectCategory?.(category)}
      />
    </View>
  );
}

function TrustPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.trustPill}>
      <Ionicons name={icon} size={12} color={PREMIUM.accentSoft} />
      <Text style={styles.trustText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: PREMIUM.bg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59,130,246,0.18)',
  },
  ambientGlowAccent: {
    position: 'absolute',
    top: 40,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(96,165,250,0.1)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandBlock: {
    flex: 1,
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
  iconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  iconChip: {
    alignItems: 'center',
    gap: 4,
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  iconChipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  iconLabel: {
    color: PREMIUM.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: PREMIUM.bg,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  deliveryCardPressed: {
    opacity: 0.9,
  },
  deliveryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251,191,36,0.14)',
  },
  deliveryCopy: {
    flex: 1,
    gap: 2,
  },
  deliveryKicker: {
    color: PREMIUM.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  deliveryLine: {
    color: PREMIUM.text,
    fontSize: 13,
    fontWeight: '500',
  },
  deliveryStrong: {
    color: '#fff',
    fontWeight: '800',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
    fontWeight: '500',
  },
  searchBtn: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.18)',
  },
  trustText: {
    color: PREMIUM.accentSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  quickNav: {
    gap: 8,
    paddingRight: 8,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: 168,
    backgroundColor: PREMIUM.bgGlass,
  },
  quickPillActive: {
    backgroundColor: 'rgba(59,130,246,0.14)',
  },
  quickPillPressed: {
    opacity: 0.85,
  },
  quickPillText: {
    color: PREMIUM.text,
    fontSize: 12,
    fontWeight: '600',
  },
  headerFooter: {
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PREMIUM.borderGlass,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingVertical: 4,
  },
  categoriesBtnPressed: {
    opacity: 0.8,
  },
  categoriesIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgElevated,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  categoriesText: {
    color: PREMIUM.text,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  resultsBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
  },
  resultsCount: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  resultsHint: {
    color: PREMIUM.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
