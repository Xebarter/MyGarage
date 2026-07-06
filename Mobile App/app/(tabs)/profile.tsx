import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingView } from '@/components/LoadingView';
import { ProfileControlCenter } from '@/components/profile/ProfileControlCenter';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { updateBuyerProfile } from '@/lib/api';
import { config } from '@/lib/config';
import { formatCurrency } from '@/lib/format';

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
};

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

function formatMemberSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Member';
  return `Member since ${date.toLocaleDateString('en-UG', { month: 'short', year: 'numeric' })}`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, profile, loading, configured, signOut, refreshProfile } = useAuth();

  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) void refreshProfile();
    }, [refreshProfile, user]),
  );

  const customer = profile?.customer;
  const firstName = customer?.name?.trim().split(/\s+/)[0] ?? 'there';

  const openPhoneEditor = () => {
    setPhoneDraft(customer?.phone ?? '');
    setPhoneError(null);
    setPhoneSheetOpen(true);
  };

  const savePhone = async () => {
    const trimmed = phoneDraft.trim();
    if (!trimmed) {
      setPhoneError('Enter a valid phone number.');
      return;
    }
    if (trimmed.length < 9) {
      setPhoneError('Phone number looks too short.');
      return;
    }
    if (!customer?.id) return;

    setPhoneSaving(true);
    setPhoneError(null);
    try {
      await updateBuyerProfile(customer.id, { phone: trimmed });
      await refreshProfile();
      setPhoneSheetOpen(false);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Could not save phone number.');
    } finally {
      setPhoneSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
        <LoadingView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <View style={[styles.hero, { paddingTop: 16 }]}>
          <View style={styles.accentBar} />
          <View style={styles.heroTop}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.heroBrand}>{config.appName}</Text>
          </View>

          {user && customer ? (
            <>
              <View style={styles.identityRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(customer.name)}</Text>
                </View>
                <View style={styles.identityCopy}>
                  <Text style={styles.greeting}>Hello, {firstName}</Text>
                  <Text style={styles.displayName}>{customer.name}</Text>
                  <Text style={styles.memberSince}>{formatMemberSince(customer.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <StatCard label="Orders" value={String(customer.totalOrders)} icon="bag-check-outline" />
                <StatCard label="Spent" value={formatCurrency(customer.totalSpent)} icon="wallet-outline" />
                <StatCard label="Wishlist" value={String(profile.stats.wishlistItems)} icon="heart-outline" />
                <StatCard
                  label="Services"
                  value={String(profile.stats.serviceRequests ?? 0)}
                  icon="car-outline"
                />
              </View>
            </>
          ) : (
            <View style={styles.guestCard}>
              <Text style={styles.guestTitle}>Your account</Text>
              <Text style={styles.guestHint}>
                {configured
                  ? 'Sign in to sync orders, wishlist, and service requests across devices.'
                  : 'This APK was built without Supabase settings. Set production env vars on expo.dev, then run a new eas build.'}
              </Text>
              {configured ? (
                <Link href="/(auth)/login" asChild>
                  <Pressable style={({ pressed }) => [styles.signInBtn, pressed && styles.signInBtnPressed]}>
                    <Ionicons name="log-in-outline" size={18} color="#fff" />
                    <Text style={styles.signInBtnText}>Sign in or create account</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          )}
        </View>

        {user && customer ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Contact</Text>
            <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ContactRow
                icon="mail-outline"
                label="Email"
                value={customer.email}
                colors={colors}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ContactRow
                icon="call-outline"
                label="Phone"
                value={customer.phone?.trim() || 'Not set'}
                colors={colors}
                muted={!customer.phone?.trim()}
                actionLabel={customer.phone?.trim() ? 'Edit' : 'Add'}
                onAction={openPhoneEditor}
              />
            </View>
          </View>
        ) : null}

        {user && customer ? (
          <ProfileControlCenter customerId={customer.id} onRefreshProfile={refreshProfile} />
        ) : null}

        {user ? (
          <Pressable
            onPress={() => void signOut()}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <PhoneEditSheet
        visible={phoneSheetOpen}
        value={phoneDraft}
        saving={phoneSaving}
        error={phoneError}
        onChange={setPhoneDraft}
        onClose={() => setPhoneSheetOpen(false)}
        onSave={() => void savePhone()}
        bottomInset={insets.bottom}
      />
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={14} color={PREMIUM.accentSoft} />
      </View>
      <View style={styles.statCopy}>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {value}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
  colors,
  muted,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
  muted?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.contactRow}>
      <View style={[styles.contactIcon, { backgroundColor: colors.primary + '12' }]}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.contactCopy}>
        <Text style={[styles.contactLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text
          style={[
            styles.contactValue,
            { color: muted ? colors.textMuted : colors.text },
          ]}
          numberOfLines={2}>
          {value}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.contactAction, pressed && { opacity: 0.8 }]}>
          <Text style={[styles.contactActionText, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PhoneEditSheet({
  visible,
  value,
  saving,
  error,
  onChange,
  onClose,
  onSave,
  bottomInset,
}: {
  visible: boolean;
  value: string;
  saving: boolean;
  error: string | null;
  onChange: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
  bottomInset: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetAvoid}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: bottomInset + 16,
              },
            ]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Phone number</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={[styles.sheetHint, { color: colors.textMuted }]}>
              Used for checkout, service updates, and provider contact.
            </Text>

            <View
              style={[
                styles.phoneInputWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: error ? colors.destructive : colors.border,
                },
              ]}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} />
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="e.g. +256 700 000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoFocus
                style={[styles.phoneInput, { color: colors.text }]}
              />
            </View>

            {error ? <Text style={[styles.sheetError, { color: colors.destructive }]}>{error}</Text> : null}

            <Pressable
              onPress={onSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: colors.primary, opacity: saving || pressed ? 0.88 : 1 },
              ]}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save phone number</Text>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: 18,
  },
  hero: {
    backgroundColor: PREMIUM.bg,
    paddingHorizontal: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    gap: 18,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: PREMIUM.accent,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
  },
  heroBrand: {
    color: PREMIUM.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlow,
  },
  avatarText: {
    color: PREMIUM.accentSoft,
    fontSize: 22,
    fontWeight: '800',
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    color: PREMIUM.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  displayName: {
    color: PREMIUM.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  memberSince: {
    color: PREMIUM.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.14)',
    flexShrink: 0,
  },
  statCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  statValue: {
    color: PREMIUM.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    color: PREMIUM.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  guestCard: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  guestTitle: {
    color: PREMIUM.text,
    fontSize: 18,
    fontWeight: '800',
  },
  guestHint: {
    color: PREMIUM.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  signInBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: PREMIUM.accent,
  },
  signInBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  contactAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  contactActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  linkRowPressed: {
    opacity: 0.86,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCopy: {
    flex: 1,
    gap: 2,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  linkHint: {
    fontSize: 12,
  },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
  signOutBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  sheetAvoid: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.45)',
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    fontWeight: '500',
  },
  sheetError: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
