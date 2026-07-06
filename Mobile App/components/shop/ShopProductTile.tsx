import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { getShopProductAccent, shopProductAccentIndex } from '@/constants/ShopProductAccents';
import { useColorScheme } from '@/components/useColorScheme';
import { formatCurrency, formatProductPrice } from '@/lib/format';
import type { Product } from '@/types';

type ShopProductTileProps = {
  product: Product;
  width?: number | `${number}%`;
  compact?: boolean;
  accentIndex?: number;
  wishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
};

export function ShopProductTile({
  product,
  width = '48%',
  compact = false,
  accentIndex,
  wishlisted = false,
  onToggleWishlist,
  onAddToCart,
}: ShopProductTileProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const accent = getShopProductAccent(accentIndex ?? shopProductAccentIndex(product.id), scheme);
  const hasDeal = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const discountPercent = hasDeal
    ? Math.max(1, Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100))
    : 0;
  const chipBorder = accent.border;

  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable
        style={({ pressed }) =>
          StyleSheet.flatten([
            styles.card,
            {
              width,
              backgroundColor: accent.bg,
              borderColor: accent.border,
              opacity: pressed ? 0.94 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ])
        }>
        <View style={[styles.imageWrap, { backgroundColor: accent.bg }]}>
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
          <View style={styles.overlayActions}>
            {hasDeal ? (
              <View style={[styles.saleBadge, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.saleText}>-{discountPercent}%</Text>
              </View>
            ) : product.featured ? (
              <View style={[styles.saleBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.saleText}>Featured</Text>
              </View>
            ) : (
              <View />
            )}
            <Pressable
              onPress={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleWishlist?.(product);
              }}
              hitSlop={8}
              style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
              <Ionicons
                name={wishlisted ? 'heart' : 'heart-outline'}
                size={17}
                color={wishlisted ? '#DC2626' : colors.text}
              />
            </Pressable>
          </View>
        </View>

        <View style={[styles.body, compact && styles.bodyCompact, { backgroundColor: accent.bg }]}>
          <Text style={[styles.category, { color: colors.textMuted }]} numberOfLines={1}>
            {product.category || 'Auto part'}
          </Text>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={compact ? 2 : 3}>
            {product.name}
          </Text>
          {product.brand ? (
            <Text style={[styles.brand, { color: colors.textMuted }]} numberOfLines={1}>
              {product.brand}
            </Text>
          ) : null}

          <View style={styles.priceBlock}>
            <Text style={[styles.price, { color: colors.text }]}>{formatProductPrice(product)}</Text>
            {hasDeal ? (
              <Text style={[styles.comparePrice, { color: colors.textMuted }]}>
                {formatCurrency(product.compareAtPrice!)}
              </Text>
            ) : null}
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.metaPills}>
              <View style={[styles.metaPill, { borderColor: chipBorder }]}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={[styles.metaText, { color: colors.text }]}>4.7</Text>
              </View>
              <View style={[styles.metaPill, { borderColor: chipBorder }]}>
                <Text style={[styles.metaText, { color: colors.text }]}>
                  {product.variants.length > 0 ? `${product.variants.length} options` : 'In stock'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAddToCart?.(product);
              }}
              style={[styles.quickAdd, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageWrap: {
    position: 'relative',
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayActions: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  saleBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  saleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 12,
    gap: 6,
  },
  bodyCompact: {
    gap: 4,
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  name: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    minHeight: 38,
  },
  brand: {
    fontSize: 12,
  },
  priceBlock: {
    gap: 2,
    marginTop: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
  },
  comparePrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  bottomRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
  },
  metaPills: {
    flex: 1,
    gap: 6,
  },
  metaPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickAdd: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
