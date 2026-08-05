import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { AppTheme, appShadow } from '@/constants/AppTheme';
import { useColorScheme } from '@/components/useColorScheme';

type EmptyStateProps = {
  title: string;
  message?: string;
  action?: React.ReactNode;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

export function EmptyState({
  title,
  message,
  action,
  icon = 'file-tray-outline',
}: EmptyStateProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, appShadow('sm')]}>
        <View style={styles.iconInner}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 56,
    gap: 10,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  action: {
    marginTop: 14,
  },
});
