import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter, type Href } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { QUICK_SERVICE_ACTIONS } from '@/constants/ServiceCategoryMeta';
import { SERVICES_HEADER, SERVICES_PREMIUM } from '@/constants/ServicesPremiumTheme';
import { getPriorityPalette, priorityLegend } from '@/constants/ServicePriorities';
import { useColorScheme } from '@/components/useColorScheme';
import type { ServicePriority } from '@/types';

const LOGO = require('@/assets/images/logo-black.png');
const PREMIUM = SERVICES_PREMIUM;
const HEADER = SERVICES_HEADER;

type ServicesHeaderProps = {
  query: string;
  onQueryChange: (text: string) => void;
  priorityFilter: ServicePriority | null;
  onPriorityFilterChange: (priority: ServicePriority | null) => void;
  locationLabel?: string;
};

export function ServicesHeader({
  query,
  onQueryChange,
  priorityFilter,
  onPriorityFilterChange,
  locationLabel,
}: ServicesHeaderProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';

  const serviceLine = locationLabel?.trim() || 'Set location in profile';

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
    active: priorityFilter === item.priority,
  }));

  return (
    <View style={styles.shellWrap}>
      <LinearGradient
        colors={[HEADER.shellTop, HEADER.shellBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.shell, { paddingTop: 10 }]}>
        <View style={[styles.glowPrimary, { backgroundColor: HEADER.glowPrimary }]} pointerEvents="none" />
        <View style={[styles.glowSecondary, { backgroundColor: HEADER.glowSecondary }]} pointerEvents="none" />

        <View style={styles.topRow}>
          <View style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" />
              <Text style={styles.brandName}>MyGarage</Text>
            </View>
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
          accessibilityLabel={`Service location: ${serviceLine}`}>
          <Ionicons name="location-outline" size={15} color={PREMIUM.textMuted} />
          <Text style={styles.locationLine} numberOfLines={1}>
            {serviceLine}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={PREMIUM.textMuted} />
        </Pressable>

        <View style={styles.searchField}>
          <Ionicons name="search-outline" size={18} color={PREMIUM.textMuted} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search services"
            placeholderTextColor={PREMIUM.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search services"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => onQueryChange('')}
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
          contentContainerStyle={styles.quickScroll}>
          {quickLinks.map((item) => (
            <Link key={item.id} href={item.href as Href} asChild>
              <Pressable
                style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={item.label}>
                <Ionicons name={item.icon} size={18} color={PREMIUM.text} />
                <Text style={styles.quickTileText} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            </Link>
          ))}
        </ScrollView>

        <View style={styles.priorityRow}>
          {priorityLinks.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onPriorityFilterChange(item.active ? null : item.priority)}
              style={({ pressed }) => [
                styles.priorityPill,
                item.active && styles.priorityPillActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: item.active }}
              accessibilityLabel={item.label}>
              <Text
                style={[styles.priorityPillText, item.active && styles.priorityPillTextActive]}
                numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E6EE',
    overflow: 'hidden',
  },
  glowPrimary: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  glowSecondary: {
    position: 'absolute',
    top: 30,
    left: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
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
  brandName: {
    color: PREMIUM.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7F9',
    borderWidth: 1,
    borderColor: HEADER.borderGlass,
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
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#F6F7F9',
    borderWidth: 1,
    borderColor: HEADER.borderGlass,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: PREMIUM.text,
    paddingVertical: 0,
    fontWeight: '500',
  },
  quickScroll: {
    gap: 8,
    paddingRight: 4,
  },
  quickTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: HEADER.borderGlass,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F6F7F9',
  },
  quickTileText: {
    color: PREMIUM.text,
    fontSize: 12,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HEADER.borderGlass,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 9,
    backgroundColor: '#F6F7F9',
  },
  priorityPillActive: {
    borderColor: PREMIUM.accent,
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  priorityPillText: {
    color: PREMIUM.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  priorityPillTextActive: {
    color: PREMIUM.accentDeep,
    fontWeight: '700',
  },
});
