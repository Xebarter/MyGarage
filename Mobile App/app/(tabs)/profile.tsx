import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingView } from '@/components/LoadingView';
import { ProfileHeaderGuest, ProfileHeaderSignedIn } from '@/components/profile/ProfileHeader';
import { ProfileHubMenu } from '@/components/profile/ProfileHubMenu';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { VehiclesTab } from '@/components/profile/VehiclesTab';
import Colors from '@/constants/Colors';
import { getProfilePageBackground, SERVICES_PREMIUM } from '@/constants/ServicesPremiumTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchBuyerControlCenter, fetchBuyerVehicles, updateBuyerProfile } from '@/lib/api';
import type { BuyerVehicle } from '@/types';

const PREMIUM = SERVICES_PREMIUM;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const pageBackground = getProfilePageBackground(scheme);
  const { user, profile, loading, configured, signOut, refreshProfile } = useAuth();

  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [vehicles, setVehicles] = useState<BuyerVehicle[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHubData = useCallback(async () => {
    const customerId = profile?.customer.id;
    if (!customerId) return;
    try {
      const [center, vehicleList] = await Promise.all([
        fetchBuyerControlCenter(customerId),
        fetchBuyerVehicles(customerId),
      ]);
      setUnreadAlerts(center.unreadNotificationCount);
      setVehicles(vehicleList);
    } catch {
      // keep last known values
    }
  }, [profile?.customer.id]);

  useFocusEffect(
    useCallback(() => {
      if (user) void refreshProfile();
      void loadHubData();
    }, [loadHubData, refreshProfile, user]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      await loadHubData();
    } finally {
      setRefreshing(false);
    }
  }, [loadHubData, refreshProfile]);

  const customer = profile?.customer;

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
      <SafeAreaView style={[styles.screen, { backgroundColor: pageBackground }]} edges={['top']}>
        <LoadingView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: pageBackground }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          user && customer ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />
          ) : undefined
        }
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        {user && customer ? (
          <ProfileHeaderSignedIn
            name={customer.name}
            email={customer.email}
            phone={customer.phone}
            totalOrders={customer.totalOrders}
            totalSpent={customer.totalSpent}
            wishlistItems={profile.stats.wishlistItems}
            serviceRequests={profile.stats.serviceRequests ?? 0}
            unreadAlerts={unreadAlerts}
            onOpenSettings={() => router.push('/profile/settings' as Href)}
            onEditPhone={openPhoneEditor}
          />
        ) : (
          <ProfileHeaderGuest>
            <Text style={styles.guestTitle}>Your account</Text>
            <Text style={styles.guestHint}>
              {configured
                ? 'Sign in to sync orders, wishlist, and service requests across devices.'
                : 'This APK was built without Supabase settings. Set production env vars on expo.dev, then run a new eas build.'}
            </Text>
            {configured ? (
              <Link href="/(auth)/login" asChild>
                <Pressable style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={styles.signInBtnText}>Sign in or create account</Text>
                </Pressable>
              </Link>
            ) : null}
          </ProfileHeaderGuest>
        )}

        {user && customer ? (
          <>
            <ProfileSection
              title="My Garage"
              subtitle="Vehicles registered to your account"
              action={{ label: 'Add', onPress: () => router.push('/garage/add') }}
              secondaryAction={{ label: 'View all', onPress: () => router.push('/garage/index') }}>
              <VehiclesTab
                colors={colors}
                vehicles={vehicles}
                onAdd={() => router.push('/garage/add')}
                onOpenAll={() => router.push('/garage/index')}
                limit={3}
                showAddButton={false}
              />
            </ProfileSection>

            <ProfileHubMenu unreadAlerts={unreadAlerts} />
          </>
        ) : null}

        {user ? (
          <Pressable
            onPress={() => void signOut()}
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}>
            <Ionicons name="log-out-outline" size={17} color={colors.textMuted} />
            <Text style={[styles.signOutText, { color: colors.textMuted }]}>Sign out</Text>
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
    paddingHorizontal: 16,
    paddingTop: 0,
    gap: 20,
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
  pressed: {
    opacity: 0.88,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
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
