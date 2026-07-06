import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { PROFILE_CARD_SHADOW } from '@/components/profile/profile-ui';

type Action = {
  label: string;
  onPress: () => void;
};

type Props = {
  title: string;
  subtitle?: string;
  action?: Action;
  secondaryAction?: Action;
  children: ReactNode;
};

export function ProfileSection({ title, subtitle, action, secondaryAction, children }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          {secondaryAction ? (
            <Pressable onPress={secondaryAction.onPress} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={[styles.secondaryAction, { color: colors.textMuted }]}>{secondaryAction.label}</Text>
            </Pressable>
          ) : null}
          {action ? (
            <Pressable
              onPress={action.onPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.primaryAction,
                { backgroundColor: colors.primary + '14', opacity: pressed ? 0.88 : 1 },
              ]}>
              <Text style={[styles.primaryActionText, { color: colors.primary }]}>{action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={[styles.card, PROFILE_CARD_SHADOW, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 2,
  },
  headerCopy: { flex: 1, gap: 3 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  primaryAction: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: { opacity: 0.75 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
