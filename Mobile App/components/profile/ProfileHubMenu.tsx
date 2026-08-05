import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileMenuList } from '@/components/profile/ProfileMenuList';
import {
  PROFILE_HUB_SECTIONS,
  SETTINGS_SECTIONS,
  isProfileHubSection,
  isSettingsSection,
  type ProfileMenuItem,
} from '@/components/profile/profile-sections';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  unreadAlerts?: number;
};

const HUB_BLOCKS: Array<{
  title: string;
  subtitle: string;
  groups: typeof SETTINGS_SECTIONS;
}> = [
  {
    title: 'Account & billing',
    subtitle: 'Profile, alerts, payments and plans',
    groups: SETTINGS_SECTIONS,
  },
  {
    title: 'Garage & activity',
    subtitle: 'Documents, services and insights',
    groups: PROFILE_HUB_SECTIONS,
  },
];

export function ProfileHubMenu({ unreadAlerts = 0 }: Props) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const openItem = (item: ProfileMenuItem) => {
    if (item.navigateTo) {
      router.push(item.navigateTo);
      return;
    }
    if (isSettingsSection(item.id)) {
      router.push(`/profile/settings/${item.id}` as Href);
      return;
    }
    if (isProfileHubSection(item.id)) {
      router.push(`/profile/section/${item.id}` as Href);
    }
  };

  return (
    <View style={styles.hub}>
      {HUB_BLOCKS.map((block) => (
        <View key={block.title} style={styles.block}>
          <View style={styles.blockHeader}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>{block.title}</Text>
            <Text style={[styles.blockSubtitle, { color: colors.textMuted }]}>{block.subtitle}</Text>
          </View>
          <ProfileMenuList
            groups={block.groups}
            onSelect={openItem}
            badgeForItem={(item) => (item.id === 'notifications' && unreadAlerts > 0 ? unreadAlerts : 0)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hub: { gap: 20 },
  block: { gap: 10 },
  blockHeader: { gap: 3, paddingHorizontal: 2 },
  blockTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  blockSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
