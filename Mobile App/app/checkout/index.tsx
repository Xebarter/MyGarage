import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useColorScheme } from '@/components/useColorScheme';
import { createPaytotaCheckout } from '@/lib/api';
import { setLastCheckoutId } from '@/lib/checkout-storage';
import { formatCurrency } from '@/lib/format';
import type { CartItem } from '@/types';

WebBrowser.maybeCompleteAuthSession();

const TAX_RATE = 0.08;
const PAYMENT_RETURN_URL = 'mygarage://';

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

type ColorSet = (typeof Colors)['light'];

function lineTotal(item: CartItem) {
  return item.price * item.quantity;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const pageBg = scheme === 'dark' ? colors.background : '#F4F7FB';
  const { items, subtotal, itemCount, clearCart } = useCart();
  const { profile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  useEffect(() => {
    const customer = profile?.customer;
    if (!customer) return;
    if (!name && customer.name) setName(customer.name);
    if (!email && customer.email) setEmail(customer.email);
    if (!phone && customer.phone) setPhone(customer.phone);
    if (!address && customer.address) setAddress(customer.address);
  }, [address, email, name, phone, profile?.customer]);

  const tax = useMemo(() => Math.round(subtotal * TAX_RATE), [subtotal]);
  const total = subtotal + tax;

  const deliveryComplete = Boolean(name.trim() && email.trim() && phone.trim() && address.trim());

  if (items.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]} edges={['top']}>
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIconRing, { backgroundColor: pageBg }]}>
                <View style={styles.emptyIconInner}>
                  <Ionicons name="bag-check-outline" size={32} color={PREMIUM.accent} />
                </View>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing to checkout</Text>
              <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>
                Add items to your cart first, then return here to complete payment.
              </Text>
              <Pressable
                onPress={() => router.replace('/(tabs)/shop')}
                style={({ pressed }) => [
                  styles.emptyCta,
                  { backgroundColor: PREMIUM.accentDeep, opacity: pressed ? 0.88 : 1 },
                ]}>
                <Ionicons name="grid-outline" size={18} color="#fff" />
                <Text style={styles.emptyCtaText}>Browse shop</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const handlePay = async () => {
    setError(null);
    if (!deliveryComplete) {
      setError('Fill in all delivery details to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const payment = await createPaytotaCheckout({
        items: items.map((item) => ({
          productId: item.productId,
          name: item.variantLabel ? `${item.productName} (${item.variantLabel})` : item.productName,
          price: item.price,
          quantity: item.quantity,
        })),
        customerName: name.trim(),
        customerEmail: email.trim().toLowerCase(),
        customerPhone: phone.trim(),
        shippingAddress: address.trim(),
      });

      await setLastCheckoutId(payment.checkoutId);

      if (payment.checkoutUrl) {
        const result = await WebBrowser.openAuthSessionAsync(payment.checkoutUrl, PAYMENT_RETURN_URL);
        if (result.type === 'success' && result.url) {
          const { path, queryParams } = Linking.parse(result.url);
          const returnedCheckoutId =
            typeof queryParams?.checkoutId === 'string' ? queryParams.checkoutId : payment.checkoutId;

          if (path === 'checkout/complete') {
            clearCart();
            router.replace({
              pathname: '/checkout/complete',
              params: { checkoutId: returnedCheckoutId },
            });
            return;
          }

          if (path === 'checkout/failed') {
            router.replace({
              pathname: '/checkout/failed',
              params: {
                checkoutId: returnedCheckoutId,
                cancelled: queryParams?.cancelled === '1' ? '1' : undefined,
              },
            });
            return;
          }
        }

        if (result.type === 'cancel' || result.type === 'dismiss') {
          router.replace({
            pathname: '/checkout/failed',
            params: { checkoutId: payment.checkoutId, cancelled: '1' },
          });
          return;
        }
      }

      router.replace({
        pathname: '/checkout/failed',
        params: { checkoutId: payment.checkoutId },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerGlow} pointerEvents="none" />
          <View style={styles.headerAccent} pointerEvents="none" />

          <View style={styles.headerTop}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [styles.backBtn, pressed && styles.chipPressed]}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={22} color={PREMIUM.text} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Checkout</Text>
              <Text style={styles.headerSubtitle}>
                {itemCount} item{itemCount === 1 ? '' : 's'} · {formatCurrency(total)}
              </Text>
            </View>
            <Pressable
              onPress={() => router.replace('/(tabs)/cart')}
              style={({ pressed }) => [styles.cartChip, pressed && styles.chipPressed]}>
              <Ionicons name="cart-outline" size={16} color={PREMIUM.accentSoft} />
            </Pressable>
          </View>

          <CheckoutSteps deliveryComplete={deliveryComplete} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 168 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <SectionCard
              colors={colors}
              pageBg={pageBg}
              title="Order summary"
              icon="receipt-outline"
              action={
                <Pressable
                  onPress={() => setSummaryExpanded((v) => !v)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.sectionAction, pressed && styles.chipPressed]}>
                  <Text style={[styles.sectionActionText, { color: PREMIUM.accentDeep }]}>
                    {summaryExpanded ? 'Collapse' : 'Expand'}
                  </Text>
                  <Ionicons
                    name={summaryExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={PREMIUM.accentDeep}
                  />
                </Pressable>
              }>
              {summaryExpanded ? (
                <View style={styles.summaryList}>
                  {items.map((item) => {
                    const key = `${item.productId}:${item.variantId ?? 'default'}`;
                    return (
                      <View key={key} style={[styles.summaryItem, { borderColor: colors.border }]}>
                        <View style={[styles.thumbWrap, { backgroundColor: pageBg }]}>
                          <Image source={{ uri: item.image }} style={styles.thumb} />
                          <View style={styles.qtyBadge}>
                            <Text style={styles.qtyBadgeText}>×{item.quantity}</Text>
                          </View>
                        </View>
                        <View style={styles.summaryItemBody}>
                          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                            {item.productName}
                          </Text>
                          {item.variantLabel ? (
                            <Text style={[styles.itemVariant, { color: colors.textMuted }]} numberOfLines={1}>
                              {item.variantLabel}
                            </Text>
                          ) : null}
                          <Text style={[styles.itemPrice, { color: colors.textMuted }]}>
                            {formatCurrency(item.price)} each
                          </Text>
                        </View>
                        <Text style={[styles.itemTotal, { color: colors.text }]}>
                          {formatCurrency(lineTotal(item))}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.collapsedHint, { color: colors.textMuted }]}>
                  {itemCount} item{itemCount === 1 ? '' : 's'} · Subtotal {formatCurrency(subtotal)}
                </Text>
              )}
            </SectionCard>

            <SectionCard colors={colors} pageBg={pageBg} title="Delivery details" icon="location-outline">
              <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                We will use these details for order updates and delivery coordination.
              </Text>
              <Field
                label="Full name"
                value={name}
                onChangeText={setName}
                colors={colors}
                pageBg={pageBg}
                icon="person-outline"
                autoCapitalize="words"
                placeholder="Your full name"
              />
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                colors={colors}
                pageBg={pageBg}
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
              />
              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                colors={colors}
                pageBg={pageBg}
                icon="call-outline"
                keyboardType="phone-pad"
                placeholder="07xx xxx xxx"
              />
              <Field
                label="Delivery address"
                value={address}
                onChangeText={setAddress}
                colors={colors}
                pageBg={pageBg}
                icon="navigate-outline"
                multiline
                placeholder="Area, street, building, landmark"
              />
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                style={({ pressed }) => [styles.profileLink, pressed && styles.chipPressed]}>
                <Ionicons name="create-outline" size={14} color={PREMIUM.accentDeep} />
                <Text style={[styles.profileLinkText, { color: PREMIUM.accentDeep }]}>
                  Update saved details in profile
                </Text>
              </Pressable>
            </SectionCard>

            <SectionCard colors={colors} pageBg={pageBg} title="Payment method" icon="wallet-outline">
              <View style={[styles.paymentCard, { borderColor: PREMIUM.accent, backgroundColor: pageBg }]}>
                <View style={styles.paymentIconWrap}>
                  <Ionicons name="phone-portrait" size={20} color={PREMIUM.accentDeep} />
                </View>
                <View style={styles.paymentCopy}>
                  <Text style={[styles.paymentTitle, { color: colors.text }]}>Mobile money</Text>
                  <Text style={[styles.paymentHint, { color: colors.textMuted }]}>
                    Pay securely with MTN or Airtel via Paytota
                  </Text>
                </View>
                <View style={styles.paymentSelected}>
                  <Ionicons name="checkmark-circle" size={22} color={PREMIUM.accentDeep} />
                </View>
              </View>
              <View style={styles.trustRow}>
                <TrustBadge icon="shield-checkmark-outline" label="Encrypted" />
                <TrustBadge icon="lock-closed-outline" label="PCI secure" />
                <TrustBadge icon="flash-outline" label="Instant" />
              </View>
            </SectionCard>

            <SectionCard colors={colors} pageBg={pageBg} title="Price breakdown" icon="calculator-outline">
              <BreakdownRow label="Subtotal" value={formatCurrency(subtotal)} colors={colors} />
              <BreakdownRow
                label="Estimated tax (8%)"
                value={formatCurrency(tax)}
                colors={colors}
                hint="Final tax confirmed at payment"
              />
              <BreakdownRow label="Delivery" value="Calculated later" colors={colors} mutedValue />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <BreakdownRow label="Total due now" value={formatCurrency(total)} colors={colors} emphasis />
            </SectionCard>

            {error ? (
              <View style={[styles.errorCard, { backgroundColor: colors.destructive + '12' }]}>
                <Ionicons name="alert-circle" size={18} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom + 12,
              },
            ]}>
            <View style={styles.footerSummary}>
              <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Total to pay</Text>
              <Text style={[styles.footerTotal, { color: colors.text }]}>{formatCurrency(total)}</Text>
            </View>
            <Pressable
              onPress={() => void handlePay()}
              disabled={submitting}
              style={({ pressed }) => [
                styles.payBtn,
                {
                  backgroundColor: PREMIUM.accentDeep,
                  opacity: submitting ? 0.75 : pressed ? 0.9 : 1,
                },
              ]}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.payBtnContent}>
                  <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>Pay {formatCurrency(total)}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
            <Text style={[styles.footerNote, { color: colors.textMuted }]}>
              You will be redirected to complete mobile money payment
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function CheckoutSteps({ deliveryComplete }: { deliveryComplete: boolean }) {
  const steps = [
    { id: 'cart', label: 'Cart', done: true },
    { id: 'details', label: 'Details', done: deliveryComplete, active: !deliveryComplete },
    { id: 'pay', label: 'Pay', done: false, active: deliveryComplete },
  ] as const;

  return (
    <View style={styles.stepsRow}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepSlot}>
          <View style={styles.stepInner}>
            <View
              style={[
                styles.stepDot,
                step.done && styles.stepDotDone,
                step.active && styles.stepDotActive,
              ]}>
              {step.done ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={[styles.stepNumber, step.active && styles.stepNumberActive]}>{index + 1}</Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                step.done && styles.stepLabelDone,
                step.active && styles.stepLabelActive,
              ]}>
              {step.label}
            </Text>
          </View>
          {index < steps.length - 1 ? (
            <View style={[styles.stepLine, step.done && styles.stepLineDone]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function SectionCard({
  title,
  icon,
  colors,
  pageBg,
  action,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ColorSet;
  pageBg: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: pageBg }]}>
          <Ionicons name={icon} size={16} color={PREMIUM.accentDeep} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  pageBg,
  icon,
  keyboardType,
  autoCapitalize,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  colors: ColorSet;
  pageBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          multiline && styles.inputShellMultiline,
          { backgroundColor: pageBg, borderColor: colors.border },
        ]}>
        <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline && styles.inputMultiline, { color: colors.text }]}
        />
      </View>
    </View>
  );
}

function BreakdownRow({
  label,
  value,
  colors,
  hint,
  emphasis,
  mutedValue,
}: {
  label: string;
  value: string;
  colors: ColorSet;
  hint?: string;
  emphasis?: boolean;
  mutedValue?: boolean;
}) {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownLabelWrap}>
        <Text
          style={[
            emphasis ? styles.breakdownLabelEmphasis : styles.breakdownLabel,
            { color: emphasis ? colors.text : colors.textMuted },
          ]}>
          {label}
        </Text>
        {hint ? <Text style={[styles.breakdownHint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      <Text
        style={[
          emphasis ? styles.breakdownValueEmphasis : styles.breakdownValue,
          { color: mutedValue ? colors.textMuted : colors.text },
        ]}>
        {value}
      </Text>
    </View>
  );
}

function TrustBadge({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.trustBadge}>
      <Ionicons name={icon} size={12} color={PREMIUM.accentSoft} />
      <Text style={styles.trustBadgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
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
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: PREMIUM.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    color: PREMIUM.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  cartChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  chipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PREMIUM.borderGlass,
  },
  stepSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepInner: {
    alignItems: 'center',
    gap: 4,
    minWidth: 52,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgElevated,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  stepDotDone: {
    backgroundColor: PREMIUM.accentDeep,
    borderColor: PREMIUM.accentDeep,
  },
  stepDotActive: {
    borderColor: PREMIUM.accentSoft,
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  stepNumber: {
    color: PREMIUM.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  stepNumberActive: {
    color: PREMIUM.accentSoft,
  },
  stepLabel: {
    color: PREMIUM.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stepLabelDone: {
    color: PREMIUM.accentSoft,
  },
  stepLabelActive: {
    color: PREMIUM.text,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 16,
    borderRadius: 1,
    backgroundColor: PREMIUM.borderGlass,
  },
  stepLineDone: {
    backgroundColor: 'rgba(59,130,246,0.45)',
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: -4,
  },
  summaryList: {
    gap: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  qtyBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(15,23,42,0.78)',
  },
  qtyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  summaryItemBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  itemVariant: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 11,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
  },
  collapsedHint: {
    fontSize: 13,
    fontWeight: '600',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputShellMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 10,
    minHeight: 96,
  },
  inputIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    fontWeight: '500',
  },
  inputMultiline: {
    minHeight: 72,
    paddingTop: 0,
    paddingBottom: 0,
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  profileLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
  },
  paymentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  paymentCopy: {
    flex: 1,
    gap: 2,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  paymentHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  paymentSelected: {
    marginLeft: 4,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.18)',
  },
  trustBadgeText: {
    color: PREMIUM.accentSoft,
    fontSize: 10,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  breakdownLabelWrap: {
    flex: 1,
    gap: 2,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownLabelEmphasis: {
    fontSize: 15,
    fontWeight: '800',
  },
  breakdownHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownValueEmphasis: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  footerSummary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  footerTotal: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  payBtn: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
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
});
