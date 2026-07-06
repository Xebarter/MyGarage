import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback } from 'react';

import { ProfileMenuList } from '@/components/profile/ProfileMenuList';
import { ProfileSubpageLayout } from '@/components/profile/ProfileSubpageLayout';
import { SETTINGS_SECTIONS, type ProfileMenuItem } from '@/components/profile/profile-sections';

export default function SettingsIndexScreen() {
  const router = useRouter();

  const open = useCallback(
    (item: ProfileMenuItem) => {
      router.push(`/profile/settings/${item.id}` as Href);
    },
    [router],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ProfileSubpageLayout intro="Account details, billing, alerts, and app preferences.">
        <ProfileMenuList groups={SETTINGS_SECTIONS} onSelect={open} />
      </ProfileSubpageLayout>
    </>
  );
}
