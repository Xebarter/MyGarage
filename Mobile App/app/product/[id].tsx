import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import Colors from '@/constants/Colors';
import { SHOP_PREMIUM } from '@/constants/ShopPremiumTheme';
import { useCart } from '@/contexts/CartContext';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchProduct } from '@/lib/api';
import { formatCurrency, formatProductPrice } from '@/lib/format';
import type { Product, ProductVariant } from '@/types';

const PREMIUM = SHOP_PREMIUM;

const TRUST_PILLS = [
  { icon: 'shield-checkmark-outline' as const, label: 'Genuine parts' },
  { icon: 'flash-outline' as const, label: 'Fast delivery' },
  { icon: 'phone-portrait-outline' as const, label: 'Mobile money' },
];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const pageBg = colors.background;

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const data = await fetchProduct(id);
      setProduct(data);
      setSelectedImageIndex(0);
      if (data.variants?.length === 1) {
        setSelectedVariant(data.variants[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const extras = (product.images ?? []).filter(Boolean);
    if (extras.length > 0) return extras;
    return product.image ? [product.image] : [];
  }, [product]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    if (selectedVariant) return selectedVariant.price;
    return product.price;
  }, [product, selectedVariant]);

  const hasDeal = useMemo(() => {
    if (!product) return false;
    const base = selectedVariant?.price ?? product.price;
    const compare = product.compareAtPrice;
    return compare != null && compare > base;
  }, [product, selectedVariant]);

  const discountPercent = useMemo(() => {
    if (!product || !hasDeal || product.compareAtPrice == null) return 0;
    return Math.max(1, Math.round(((product.compareAtPrice - unitPrice) / product.compareAtPrice) * 100));
  }, [hasDeal, product, unitPrice]);

  const canAddToCart = Boolean(product && (product.variants.length === 0 || selectedVariant));

  const handleAddToCart = () => {
    if (!product || !canAddToCart) return;

    addItem({
      productId: product.id,
      productName: product.name,
      image: galleryImages[selectedImageIndex] ?? product.image,
      price: unitPrice,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: pageBg }]}>
        <LoadingView />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.screen, { backgroundColor: pageBg }]}>
        <EmptyState title="Product unavailable" message={error ?? 'Not found'} />
      </View>
    );
  }

  const displayPrice = selectedVariant ? formatCurrency(unitPrice) : formatProductPrice(product);

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          title: '',
          headerShadowVisible: false,
          headerTintColor: PREMIUM.text,
          headerStyle: { backgroundColor: PREMIUM.bg },
        }}
      />

      <View style={[styles.screen, { backgroundColor: pageBg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
          <View style={styles.heroSection}>
            <View style={styles.heroImageWrap}>
              <Image
                source={{ uri: galleryImages[selectedImageIndex] ?? product.image }}
                style={styles.heroImage}
                resizeMode="cover"
              />

              <View style={styles.heroBadges}>
                {hasDeal ? (
                  <View style={styles.dealBadge}>
                    <Text style={styles.dealBadgeText}>-{discountPercent}% OFF</Text>
                  </View>
                ) : product.featured ? (
                  <View style={[styles.dealBadge, { backgroundColor: PREMIUM.accentDeep }]}>
                    <Text style={styles.dealBadgeText}>Featured</Text>
                  </View>
                ) : (
                  <View />
                )}
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={12} color={PREMIUM.gold} />
                  <Text style={styles.ratingText}>4.7</Text>
                </View>
              </View>
            </View>

            {galleryImages.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbRow}>
                {galleryImages.map((uri, index) => {
                  const active = index === selectedImageIndex;
                  return (
                    <Pressable
                      key={`${uri}-${index}`}
                      onPress={() => setSelectedImageIndex(index)}
                      style={[
                        styles.thumb,
                        active && styles.thumbActive,
                        { borderColor: active ? PREMIUM.accentSoft : PREMIUM.borderGlass },
                      ]}>
                      <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>

          <View
            style={[
              styles.mainCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}>
            <View style={styles.mainCardAccent} pointerEvents="none" />

            <View style={styles.titleBlock}>
              {product.category ? (
                <View style={[styles.categoryPill, { backgroundColor: colors.primary + '14' }]}>
                  <Text style={[styles.category, { color: colors.primary }]}>{product.category}</Text>
                </View>
              ) : null}
              <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
              {product.brand ? (
                <Text style={[styles.brand, { color: colors.textMuted }]}>{product.brand}</Text>
              ) : null}
            </View>

            <View style={[styles.pricePanel, { backgroundColor: pageBg, borderColor: colors.border }]}>
              <View style={styles.priceRow}>
                <View style={styles.priceCopy}>
                  <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Price</Text>
                  <Text style={[styles.price, { color: colors.text }]}>{displayPrice}</Text>
                  {hasDeal ? (
                    <Text style={[styles.comparePrice, { color: colors.textMuted }]}>
                      {formatCurrency(product.compareAtPrice!)}
                    </Text>
                  ) : null}
                </View>
                {product.variants.length > 0 ? (
                  <View style={[styles.optionsPill, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="options-outline" size={13} color={colors.primary} />
                    <Text style={[styles.optionsPillText, { color: colors.primary }]}>
                      {product.variants.length} options
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.stockPill, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                    <View style={styles.stockDot} />
                    <Text style={styles.stockText}>In stock</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.trustRow}>
              {TRUST_PILLS.map((pill) => (
                <View
                  key={pill.label}
                  style={[styles.trustPill, { backgroundColor: pageBg, borderColor: colors.border }]}>
                  <Ionicons name={pill.icon} size={13} color={PREMIUM.accentSoft} />
                  <Text style={[styles.trustText, { color: colors.textMuted }]}>{pill.label}</Text>
                </View>
              ))}
            </View>

            {product.variants.length > 0 ? (
              <View style={styles.variantSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose option</Text>
                <View style={styles.variantList}>
                  {product.variants.map((variant) => {
                    const active = selectedVariant?.id === variant.id;
                    return (
                      <Pressable
                        key={variant.id}
                        onPress={() => setSelectedVariant(variant)}
                        style={({ pressed }) => [
                          styles.variantChip,
                          {
                            backgroundColor: active ? PREMIUM.accentDeep : pageBg,
                            borderColor: active ? PREMIUM.accent : colors.border,
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}>
                        <Text style={[styles.variantLabel, { color: active ? '#fff' : colors.text }]}>
                          {variant.label}
                        </Text>
                        <Text style={[styles.variantPrice, { color: active ? 'rgba(255,255,255,0.85)' : colors.textMuted }]}>
                          {formatCurrency(variant.price)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About this product</Text>
              <Text style={[styles.description, { color: colors.textMuted }]}>{product.description}</Text>
            </View>

            {product.sku || product.tags.length > 0 ? (
              <View style={styles.metaSection}>
                {product.sku ? (
                  <View style={[styles.metaChip, { backgroundColor: pageBg, borderColor: colors.border }]}>
                    <Ionicons name="barcode-outline" size={13} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>SKU {product.sku}</Text>
                  </View>
                ) : null}
                {product.tags.slice(0, 3).map((tag) => (
                  <View
                    key={tag}
                    style={[styles.metaChip, { backgroundColor: pageBg, borderColor: colors.border }]}>
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
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
          <View style={styles.footerGlow} pointerEvents="none" />
          <Pressable
              onPress={handleAddToCart}
              disabled={!canAddToCart}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: !canAddToCart ? colors.border : added ? '#16A34A' : PREMIUM.accentDeep,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}>
              <Ionicons
                name={added ? 'checkmark-circle' : 'cart-outline'}
                size={18}
                color="#fff"
              />
              <Text style={styles.addBtnText}>
                {added
                  ? 'Added to cart'
                  : !canAddToCart
                    ? 'Select an option'
                    : 'Add to cart'}
              </Text>
            </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: PREMIUM.bg,
  },
  heroImageWrap: {
    position: 'relative',
    aspectRatio: 1,
    backgroundColor: PREMIUM.bgElevated,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroBadges: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#DC2626',
  },
  dealBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  ratingText: {
    color: PREMIUM.text,
    fontSize: 12,
    fontWeight: '800',
  },
  thumbRow: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: PREMIUM.bgElevated,
  },
  thumbActive: {
    shadowColor: PREMIUM.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  mainCard: {
    marginTop: -22,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  mainCardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: PREMIUM.accent,
  },
  titleBlock: {
    gap: 8,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  category: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  brand: {
    fontSize: 14,
    fontWeight: '600',
  },
  pricePanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceCopy: {
    flex: 1,
    gap: 2,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  comparePrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  optionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  optionsPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  stockText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
  },
  variantSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  variantList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variantChip: {
    minWidth: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  variantPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionSection: {
    gap: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
  },
  metaSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    overflow: 'hidden',
  },
  footerGlow: {
    position: 'absolute',
    top: -30,
    left: '20%',
    width: '60%',
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  addBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: PREMIUM.accentDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
