import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ProfileControlCenter } from '@/components/profile/ProfileControlCenter';
import { ProfileSubpageLayout } from '@/components/profile/ProfileSubpageLayout';
import {
  getProfileSection,
  isSettingsSection,
  type SettingsSectionId,
} from '@/components/profile/profile-sections';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsSectionScreen() {
  const router = useRouter();
  const { section: rawSection } = useLocalSearchParams<{ section: string }>();
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);

  const section = typeof rawSection === 'string' ? rawSection : 'account';
  const valid = isSettingsSection(section);
  const sectionMeta = getProfileSection(valid ? section : 'account');

  useEffect(() => {
    if (!valid) {
      router.replace('/profile/settings/account' as Href);
    }
  }, [router, valid]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshRef.current?.();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const customerId = profile?.customer.id;
  if (!customerId || !valid) return null;

  return (
    <>
      <Stack.Screen options={{ title: sectionMeta.label }} />
      <ProfileSubpageLayout intro={sectionMeta.description} refreshing={refreshing} onRefresh={handleRefresh}>
        <ProfileControlCenter
          customerId={customerId}
          activeTab={section as SettingsSectionId}
          onRegisterRefresh={(refresh) => {
            refreshRef.current = refresh;
          }}
        />
      </ProfileSubpageLayout>
    </>
  );
}
