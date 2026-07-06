import { Stack } from 'expo-router';

import { NUNITO } from '@/constants/Fonts';

export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: NUNITO.bold },
      }}>
      <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      <Stack.Screen name="settings/[section]" options={{ title: 'Settings' }} />
      <Stack.Screen name="section/[section]" options={{ title: 'Profile' }} />
    </Stack>
  );
}
