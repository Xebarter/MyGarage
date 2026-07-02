import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchOrder } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Order } from '@/types';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setOrder(await fetchOrder(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingView />;
  if (error || !order) {
    return <EmptyState title="Order unavailable" message={error ?? 'Not found'} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: `Order #${order.id.slice(0, 8).toUpperCase()}` }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.hero, { backgroundColor: colors.success + '14' }]}>
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>Order confirmed</Text>
          <Text style={[styles.heroCopy, { color: colors.textMuted }]}>
            {new Date(order.createdAt).toLocaleString()}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Items</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.lineRow}>
              <View style={styles.lineCopy}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.productName}</Text>
                <Text style={[styles.itemMeta, { color: colors.textMuted }]}>Qty {item.quantity}</Text>
              </View>
              <Text style={[styles.itemPrice, { color: colors.text }]}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery</Text>
          <Text style={[styles.detail, { color: colors.text }]}>{order.customerName}</Text>
          <Text style={[styles.detailMuted, { color: colors.textMuted }]}>{order.shippingAddress}</Text>
          <Text style={[styles.detailMuted, { color: colors.textMuted }]}>{order.customerEmail}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.lineRow}>
            <Text style={[styles.detailMuted, { color: colors.textMuted }]}>Subtotal</Text>
            <Text style={[styles.detail, { color: colors.text }]}>{formatCurrency(order.subtotal)}</Text>
          </View>
          <View style={styles.lineRow}>
            <Text style={[styles.detailMuted, { color: colors.textMuted }]}>Tax</Text>
            <Text style={[styles.detail, { color: colors.text }]}>{formatCurrency(order.tax)}</Text>
          </View>
          <View style={styles.lineRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(order.total)}</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  hero: { borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 },
  heroTitle: { fontSize: 18, fontWeight: '800' },
  heroCopy: { fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  lineCopy: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemMeta: { fontSize: 12 },
  itemPrice: { fontSize: 14, fontWeight: '700' },
  detail: { fontSize: 14, fontWeight: '600' },
  detailMuted: { fontSize: 13, lineHeight: 19 },
  totalLabel: { fontSize: 15, fontWeight: '800' },
  totalValue: { fontSize: 18, fontWeight: '800' },
});
