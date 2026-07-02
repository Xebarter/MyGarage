import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, type Href } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { QUICK_SERVICE_ACTIONS } from '@/constants/ServiceCategoryMeta';
import {
  SERVICES_PREMIUM,
  SERVICES_TINT,
} from '@/constants/ServicesPremiumTheme';
import { getPriorityPalette, priorityLegend } from '@/constants/ServicePriorities';
import { useColorScheme } from '@/components/useColorScheme';
import type { ServicePriority } from '@/types';

const LOGO = require('@/assets/images/logo-black.png');

const PREMIUM = SERVICES_PREMIUM;

type ServicesHeaderProps = {
  query: string;
  onQueryChange: (text: string) => void;
  isSearching: boolean;
  priorityFilter: ServicePriority | null;
  onPriorityFilterChange: (priority: ServicePriority | null) => void;
  userName?: string;
  locationLabel?: string;
  cartCount?: number;
  onOpenCart?: () => void;
};

export function ServicesHeader({
  query,
  onQueryChange,
  isSearching,
  priorityFilter,
  onPriorityFilterChange,
  userName,
  locationLabel,
  cartCount = 0,
  onOpenCart,
}: ServicesHeaderProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';

  const greetingName = userName?.trim().split(' ')[0] || 'Guest';
  const serviceLine = locationLabel?.trim() || 'Set your service location in profile';

  const quickLinks = QUICK_SERVICE_ACTIONS.map((action) => ({
    id: action.categoryId,
    label: action.title,
    icon: action.icon,
    href: `/service/${action.categoryId}`,
  }));

  const priorityLinks = priorityLegend.map((item) => ({
    id: item.priority,
    label: getPriorityPalette(item.priority, scheme).label,
    priority: item.priority,
    accent: getPriorityPalette(item.priority, scheme).accent,
    active: priorityFilter === item.priority,
  }));

  return (
    <View style={styles.shell}>
      <View style={styles.accentBar} pointerEvents="none" />
      <View style={styles.ambientGlowTop} pointerEvents="none" />
      <View style={styles.ambientGlowAccent} pointerEvents="none" />

      <View style={styles.topRow}>
        <View style={styles.brandBlock}>
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>MyGarage</Text>
              <Text style={styles.brandTagline}>Services · Repairs & recovery</Text>
            </View>
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
                <View style={[styles.cartBadge, { backgroundColor: PREMIUM.accent }]}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.iconLabel}>Cart</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.locationCard, pressed && styles.locationCardPressed]}
        onPress={() => router.push('/(tabs)/profile')}>
        <View style={styles.locationIconWrap}>
          <Ionicons name="location" size={14} color={PREMIUM.copper} />
        </View>
        <View style={styles.locationCopy}>
          <Text style={styles.locationKicker}>Service at</Text>
          <Text style={styles.locationLine} numberOfLines={1}>
            <Text style={styles.locationStrong}>{greetingName}</Text>
            {'  ·  '}
            {serviceLine}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={PREMIUM.textMuted} />
      </Pressable>

      <View style={styles.searchShell}>
        <View style={styles.searchField}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search towing, oil change, battery…"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable
          onPress={() => onQueryChange(query)}
          style={({ pressed }) => [
            styles.searchBtn,
            { backgroundColor: PREMIUM.accentDeep, opacity: pressed ? 0.88 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Search services">
          <Ionicons name="search" size={20} color="#fff" />
        </Pressable>
      </View>

      {!isSearching ? (
        <View style={styles.toolsSection}>
          <View style={styles.quickRow}>
            {quickLinks.map((item) => (
              <View key={item.id} style={styles.quickSlot}>
                <Link href={item.href as Href} asChild>
                  <Pressable
                    style={({ pressed }) =>
                      StyleSheet.flatten([styles.quickTile, pressed && styles.quickPillPressed])
                    }>
                    <View style={styles.quickTileInner}>
                      <View style={styles.quickIconWrap}>
                        <Ionicons name={item.icon} size={18} color={PREMIUM.accentSoft} />
                      </View>
                      <Text style={styles.quickTileText} numberOfLines={2}>
                        {item.label}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              </View>
            ))}
          </View>

          <View style={styles.priorityRow}>
            {priorityLinks.map((item) => (
              <View key={item.id} style={styles.prioritySlot}>
                <Pressable
                  onPress={() => onPriorityFilterChange(item.active ? null : item.priority)}
                  style={({ pressed }) => [
                    styles.priorityPill,
                    styles.spreadPill,
                    item.active && [styles.priorityPillActive, { borderColor: item.accent }],
                    pressed && styles.quickPillPressed,
                  ]}>
                  <View style={[styles.priorityDot, { backgroundColor: item.accent }]} />
                  <Text
                    style={[
                      styles.priorityPillText,
                      item.active && { color: PREMIUM.text, fontWeight: '800' },
                    ]}
                    numberOfLines={1}>
                    {item.label}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: PREMIUM.bg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#042F2E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 12,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: PREMIUM.accent,
    opacity: 0.92,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: SERVICES_TINT.glowTop,
  },
  ambientGlowAccent: {
    position: 'absolute',
    top: 40,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: SERVICES_TINT.glowSide,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandBlock: {
    flex: 1,
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
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    color: PREMIUM.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandTagline: {
    color: PREMIUM.textMuted,
    fontSize: 12,
    fontWeight: '600',
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
  locationCard: {
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
  locationCardPressed: {
    opacity: 0.9,
  },
  locationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SERVICES_TINT.locationBg,
  },
  locationCopy: {
    flex: 1,
    gap: 2,
  },
  locationKicker: {
    color: PREMIUM.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  locationLine: {
    color: PREMIUM.text,
    fontSize: 13,
    fontWeight: '500',
  },
  locationStrong: {
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
  toolsSection: {
    gap: 12,
    paddingTop: 2,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
  },
  quickTile: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 12,
    backgroundColor: PREMIUM.bgGlass,
  },
  quickTileInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: SERVICES_TINT.iconBg,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  quickTileText: {
    color: PREMIUM.text,
    fontSize: 10,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
    alignSelf: 'center',
    lineHeight: 13,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 10,
  },
  prioritySlot: {
    flex: 1,
    minWidth: 0,
  },
  spreadPill: {
    width: '100%',
    justifyContent: 'center',
  },
  quickPillPressed: {
    opacity: 0.85,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 11,
    backgroundColor: PREMIUM.bgGlass,
  },
  priorityPillActive: {
    backgroundColor: SERVICES_TINT.activeBg,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityPillText: {
    color: PREMIUM.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
