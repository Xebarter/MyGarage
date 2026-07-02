import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchOrders } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Order } from '@/types';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.customer.id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const all = await fetchOrders();
      const mine = all
        .filter((order) => order.customerId === profile.customer.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(mine);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [profile?.customer.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingView label="Loading orders" />;

  if (!profile?.customer.id) {
    return (
      <>
        <Stack.Screen options={{ title: 'My orders' }} />
        <EmptyState title="Sign in required" message="Sign in to view your order history." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'My orders' }} />
        <EmptyState title="Orders unavailable" message={error} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'My orders' }} />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, backgroundColor: colors.background },
          orders.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={
          <EmptyState title="No orders yet" message="Your purchases will appear here after checkout." />
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/orders/[id]', params: { id: item.id } }} asChild>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.94 : 1,
                },
              ]}>
              <View style={styles.cardTop}>
                <Text style={[styles.orderId, { color: colors.text }]}>
                  #{item.id.slice(0, 8).toUpperCase()}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: colors.primary + '14' }]}>
                  <Text style={[styles.statusText, { color: colors.primary }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {new Date(item.createdAt).toLocaleDateString()} · {item.items.length} item
                {item.items.length === 1 ? '' : 's'}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={[styles.total, { color: colors.text }]}>{formatCurrency(item.total)}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          </Link>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  emptyContent: { flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  orderId: { fontSize: 15, fontWeight: '800' },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  meta: { fontSize: 13 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 17, fontWeight: '800' },
});
