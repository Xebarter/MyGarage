import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { clearLastCheckoutId } from '@/lib/checkout-storage';

export default function CheckoutCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { checkoutId: paramCheckoutId } = useLocalSearchParams<{ checkoutId?: string }>();

  useEffect(() => {
    void clearLastCheckoutId();
  }, []);

  const checkoutId = typeof paramCheckoutId === 'string' ? paramCheckoutId : undefined;

  return (
    <>
      <Stack.Screen options={{ title: 'Payment', headerShown: false }} />
      <View
        style={[
          styles.screen,
          { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.success + '18' }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Payment received</Text>
          <Text style={[styles.copy, { color: colors.textMuted }]}>
            Thank you. Your order is being confirmed and you will receive updates by email.
          </Text>
          {checkoutId ? (
            <Text style={[styles.ref, { color: colors.textMuted }]}>Reference: {checkoutId}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.replace('/orders/index')}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
          ]}>
          <Text style={styles.primaryBtnText}>View my orders</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/(tabs)/shop')}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
          ]}>
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Continue shopping</Text>
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
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
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
