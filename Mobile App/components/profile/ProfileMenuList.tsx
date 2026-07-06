import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PROFILE_CARD_SHADOW } from '@/components/profile/profile-ui';
import type { ProfileMenuItem } from '@/components/profile/profile-sections';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Group = {
  group: string;
  items: ProfileMenuItem[];
};

type Props = {
  groups: Group[];
  onSelect: (item: ProfileMenuItem) => void;
  badgeForItem?: (item: ProfileMenuItem) => number;
};

export function ProfileMenuList({ groups, onSelect, badgeForItem }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.wrap}>
      {groups.map((block, blockIndex) => (
        <View key={block.group} style={styles.block}>
          <View style={styles.blockHeader}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>{block.group}</Text>
          </View>
          <View style={[styles.card, PROFILE_CARD_SHADOW, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {block.items.map((item, index) => {
              const badge = badgeForItem?.(item) ?? 0;
              const isLast = index === block.items.length - 1;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [
                    styles.row,
                    !isLast && styles.rowBorder,
                    !isLast && { borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.background },
                  ]}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name={item.icon as IoniconName} size={19} color={colors.primary} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                  {badge > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                    </View>
                  ) : (
                    <View style={[styles.chevronWrap, { backgroundColor: colors.background }]}>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {blockIndex < groups.length - 1 ? <View style={styles.spacer} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  block: { gap: 10 },
  blockHeader: { paddingHorizontal: 2 },
  blockTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: -0.15 },
  description: { fontSize: 12, fontWeight: '500' },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  spacer: { height: 2 },
});
