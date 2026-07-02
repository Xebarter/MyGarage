import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function CheckoutFailedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { checkoutId, cancelled } = useLocalSearchParams<{ checkoutId?: string; cancelled?: string }>();

  const wasCancelled = cancelled === '1';

  return (
    <>
      <Stack.Screen options={{ title: 'Payment', headerShown: false }} />
      <View
        style={[
          styles.screen,
          { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.destructive + '14' }]}>
            <Ionicons name={wasCancelled ? 'close-circle' : 'alert-circle'} size={48} color={colors.destructive} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {wasCancelled ? 'Payment cancelled' : 'Payment not completed'}
          </Text>
          <Text style={[styles.copy, { color: colors.textMuted }]}>
            {wasCancelled
              ? 'You can return to checkout and try again when ready.'
              : 'Something went wrong with payment. Please try again.'}
          </Text>
          {checkoutId ? (
            <Text style={[styles.ref, { color: colors.textMuted }]}>Reference: {checkoutId}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.replace('/checkout')}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
          ]}>
          <Text style={styles.primaryBtnText}>Try checkout again</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/(tabs)/cart')}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
          ]}>
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Back to cart</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  copy: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  ref: { fontSize: 12, marginTop: 4 },
  primaryBtn: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
});
