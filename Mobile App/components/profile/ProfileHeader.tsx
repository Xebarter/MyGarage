import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { getProfilePremium } from '@/constants/ServicesPremiumTheme';
import { formatCurrency } from '@/lib/format';

const LOGO = require('@/assets/images/logo-black.png');

type SignedInProps = {
  name: string;
  email: string;
  phone?: string | null;
  totalOrders: number;
  totalSpent: number;
  wishlistItems: number;
  serviceRequests: number;
  unreadAlerts?: number;
  onOpenSettings?: () => void;
  onEditPhone: () => void;
};

type GuestProps = {
  children: React.ReactNode;
};

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

function ProfileHeaderShell({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = getProfilePremium(scheme);

  return (
    <View style={styles.shellWrap}>
      <LinearGradient
        colors={[palette.shellTop, palette.shellBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.shell}>
        <View style={[styles.glowPrimary, { backgroundColor: palette.glowPrimary }]} pointerEvents="none" />
        <View style={[styles.glowSecondary, { backgroundColor: palette.glowSecondary }]} pointerEvents="none" />
        {children}
        <View style={[styles.shellDivider, { backgroundColor: palette.divider }]} pointerEvents="none" />
      </LinearGradient>
    </View>
  );
}

function StatPill({
  label,
  value,
  icon,
  compact,
}: {
  label: string;
  value: string;
  icon: IoniconName;
  compact?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = getProfilePremium(scheme);

  return (
    <View style={[styles.statPill, { backgroundColor: palette.statBg, borderColor: palette.statBorder }]}>
      <Ionicons name={icon} size={13} color={palette.accentSoft} style={styles.statIcon} />
      <Text
        style={[styles.statValue, { color: palette.text }, compact && styles.statValueCompact]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

export function ProfileHeaderSignedIn({
  name,
  email,
  phone,
  totalOrders,
  totalSpent,
  wishlistItems,
  serviceRequests,
  unreadAlerts = 0,
  onOpenSettings,
  onEditPhone,
}: SignedInProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = getProfilePremium(scheme);
  const hasPhone = Boolean(phone?.trim());

  return (
    <ProfileHeaderShell>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={[styles.brandName, { color: palette.text }]}>MyGarage</Text>
            <Text style={[styles.brandTagline, { color: palette.textMuted }]}>Your garage hub</Text>
          </View>
        </View>
        <Pressable
          onPress={onOpenSettings}
          hitSlop={8}
          style={({ pressed }) => [
            styles.menuBtn,
            {
              backgroundColor: palette.menuBtnBg,
              borderColor: palette.menuBtnBorder,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open settings">
          <Ionicons name="settings-outline" size={20} color={palette.textMuted} />
          {unreadAlerts > 0 ? (
            <View style={[styles.menuDot, { borderColor: '#FFFFFF' }]} />
          ) : null}
        </Pressable>
      </View>

      <View style={[styles.identityCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
        <View style={styles.identityRow}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: palette.avatarBg, borderColor: palette.avatarBorder },
            ]}>
            <Text style={[styles.avatarText, { color: palette.accentSoft }]}>{initials(name)}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={[styles.displayName, { color: palette.text }]} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="mail-outline" size={12} color={palette.textMuted} />
              <Text style={[styles.identityMeta, { color: palette.textMuted }]} numberOfLines={1}>
                {email}
              </Text>
            </View>
            <Pressable onPress={onEditPhone} hitSlop={6} style={styles.metaRow}>
              <Ionicons name="call-outline" size={12} color={hasPhone ? palette.textMuted : palette.accentSoft} />
              <Text
                style={[
                  hasPhone ? styles.identityMeta : styles.addPhone,
                  { color: hasPhone ? palette.textMuted : palette.accentSoft },
                ]}
                numberOfLines={1}>
                {hasPhone ? phone : 'Add phone number'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatPill label="Orders" value={String(totalOrders)} icon="bag-check-outline" />
        <StatPill label="Spent" value={formatCurrency(totalSpent)} icon="wallet-outline" compact />
        <StatPill label="Wishlist" value={String(wishlistItems)} icon="heart-outline" />
        <StatPill label="Services" value={String(serviceRequests)} icon="construct-outline" />
      </View>
    </ProfileHeaderShell>
  );
}

export function ProfileHeaderGuest({ children }: GuestProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = getProfilePremium(scheme);

  return (
    <ProfileHeaderShell>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={[styles.brandName, { color: palette.text }]}>MyGarage</Text>
            <Text style={[styles.brandTagline, { color: palette.textMuted }]}>Your garage hub</Text>
          </View>
        </View>
      </View>
      <View style={[styles.guestCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
        {children}
      </View>
    </ProfileHeaderShell>
  );
}

const styles = StyleSheet.create({
  shellWrap: {
    marginHorizontal: -16,
  },
  shell: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 14,
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
  shellDivider: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    height: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  menuDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
  },
  identityCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  identityCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  identityMeta: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  addPhone: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 10,
    minWidth: 0,
  },
  statIcon: {
    marginBottom: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  statValueCompact: {
    fontSize: 11,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  guestCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
});
