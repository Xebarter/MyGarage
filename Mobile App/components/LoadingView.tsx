import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { AppTheme, appShadow } from '@/constants/AppTheme';
import { useColorScheme } from '@/components/useColorScheme';

export function LoadingView({ label }: { label?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={[styles.card, appShadow('md')]}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel={label ?? 'Loading'} />
        {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 28,
    paddingVertical: 28,
    borderRadius: AppTheme.radius.xl,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
