import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useCart } from '@/contexts/CartContext';
import { useColorScheme } from '@/components/useColorScheme';
import { formatCurrency } from '@/lib/format';
import type { CartItem } from '@/types';

const PREMIUM = {
  bg: '#0B1220',
  bgElevated: '#121C2E',
  bgGlass: 'rgba(255,255,255,0.06)',
  borderGlass: 'rgba(255,255,255,0.12)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  accent: '#3B82F6',
  accentSoft: '#60A5FA',
  accentDeep: '#2563EB',
};

function lineTotal(item: CartItem) {
  return item.price * item.quantity;
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { items, subtotal, itemCount, updateQuantity, removeItem, clearCart } = useCart();

  const pageBg = scheme === 'dark' ? colors.background : '#F4F7FB';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerGlow} pointerEvents="none" />
        <View style={styles.headerAccent} pointerEvents="none" />

        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Your cart</Text>
            <Text style={styles.headerSubtitle}>
              {itemCount > 0
                ? `${itemCount} item${itemCount === 1 ? '' : 's'} ready for checkout`
                : 'Review parts before you pay'}
            </Text>
          </View>
          {items.length > 0 ? (
            <Pressable
              onPress={() => router.push('/(tabs)/shop')}
              style={({ pressed }) => [styles.shopChip, pressed && styles.chipPressed]}>
              <Ionicons name="grid-outline" size={16} color={PREMIUM.accentSoft} />
              <Text style={styles.shopChipText}>Shop</Text>
            </Pressable>
          ) : null}
        </View>

        {items.length > 0 ? (
          <View style={styles.headerMeta}>
            <View style={styles.metaPill}>
              <Ionicons name="shield-checkmark-outline" size={13} color={PREMIUM.accentSoft} />
              <Text style={styles.metaPillText}>Secure checkout</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="phone-portrait-outline" size={13} color={PREMIUM.accentSoft} />
              <Text style={styles.metaPillText}>Mobile money</Text>
            </View>
          </View>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIconRing, { backgroundColor: pageBg }]}>
              <View style={styles.emptyIconInner}>
                <Ionicons name="cart-outline" size={32} color={PREMIUM.accent} />
              </View>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
            <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>
              Browse the shop and add spare parts or accessories to get started.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/shop')}
              style={({ pressed }) => [
                styles.emptyCta,
                { backgroundColor: PREMIUM.accentDeep, opacity: pressed ? 0.88 : 1 },
              ]}>
              <Ionicons name="grid-outline" size={18} color="#fff" />
              <Text style={styles.emptyCtaText}>Browse shop</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <ScrollView
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 160 },
            ]}
            showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const key = `${item.productId}:${item.variantId ?? 'default'}`;
              const total = lineTotal(item);
              return (
                <View
                  key={key}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.itemTop}>
                    <View style={[styles.thumbWrap, { backgroundColor: pageBg }]}>
                      <Image source={{ uri: item.image }} style={styles.thumb} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                        {item.productName}
                      </Text>
                      {item.variantLabel ? (
                        <View style={[styles.variantChip, { backgroundColor: pageBg }]}>
                          <Text style={[styles.variant, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.variantLabel}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.priceRow}>
                        <Text style={[styles.unitPrice, { color: colors.textMuted }]}>
                          {formatCurrency(item.price)} each
                        </Text>
                        <Text style={[styles.lineTotal, { color: colors.text }]}>
                          {formatCurrency(total)}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => removeItem(item.productId, item.variantId)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.removeIconBtn, pressed && styles.chipPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.productName}`}>
                      <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </Pressable>
                  </View>

                  <View style={[styles.itemFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>Quantity</Text>
                    <View style={styles.qtyControls}>
                      <Pressable
                        onPress={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                        style={({ pressed }) => [
                          styles.qtyBtn,
                          { borderColor: colors.border, backgroundColor: pageBg },
                          pressed && styles.qtyBtnPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Decrease quantity">
                        <Ionicons name="remove" size={16} color={colors.text} />
                      </Pressable>
                      <Text style={[styles.qty, { color: colors.text }]}>{item.quantity}</Text>
                      <Pressable
                        onPress={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                        style={({ pressed }) => [
                          styles.qtyBtn,
                          { borderColor: colors.border, backgroundColor: pageBg },
                          pressed && styles.qtyBtnPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Increase quantity">
                        <Ionicons name="add" size={16} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}

            <Pressable
              onPress={clearCart}
              style={({ pressed }) => [styles.clearRow, pressed && styles.chipPressed]}>
              <Ionicons name="close-circle-outline" size={16} color={colors.destructive} />
              <Text style={[styles.clearText, { color: colors.destructive }]}>Clear cart</Text>
            </Pressable>
          </ScrollView>

          <View
            style={[
              styles.checkoutBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom + 12,
              },
            ]}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Subtotal</Text>
                <Text style={[styles.summaryHint, { color: colors.textMuted }]}>
                  Taxes & delivery at checkout
                </Text>
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(subtotal)}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/checkout')}
              style={({ pressed }) => [
                styles.checkoutBtn,
                { backgroundColor: PREMIUM.accentDeep, opacity: pressed ? 0.9 : 1 },
              ]}>
              <Text style={styles.checkoutText}>Continue to checkout</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderRadius: 22,
    backgroundColor: PREMIUM.bg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  headerGlow: {
    position: 'absolute',
    top: -60,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: PREMIUM.accent,
    opacity: 0.9,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    color: PREMIUM.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: PREMIUM.textMuted,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  shopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  shopChipText: {
    color: PREMIUM.accentSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  chipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  metaPillText: {
    color: PREMIUM.accentSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  emptyIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  emptyMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  thumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  itemBody: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  variantChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  variant: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  unitPrice: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  lineTotal: {
    fontSize: 16,
    fontWeight: '800',
  },
  removeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  qtyLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnPressed: {
    opacity: 0.75,
  },
  qty: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkoutBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryHint: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
