import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { getServicesPageBackground } from '@/constants/ServicesPremiumTheme';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  children: ReactNode;
  intro?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function ProfileSubpageLayout({ children, intro, refreshing = false, onRefresh }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const pageBackground = getServicesPageBackground(scheme);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: pageBackground }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        {intro ? <Text style={[styles.intro, { color: colors.textMuted }]}>{intro}</Text> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ProfileLoadingState() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 20 },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
  loading: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },
});
