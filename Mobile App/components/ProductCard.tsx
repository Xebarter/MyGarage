import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatProductPrice } from '@/lib/format';
import type { Product } from '@/types';

type ProductCardProps = {
  product: Product;
  width?: number | `${number}%`;
};

export function ProductCard({ product, width = '48%' }: ProductCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable
        style={({ pressed }) =>
          StyleSheet.flatten([
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border, width, opacity: pressed ? 0.92 : 1 },
          ])
        }>
        <View style={styles.imageWrap}>
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
          {product.featured ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text style={[styles.category, { color: colors.textMuted }]} numberOfLines={1}>
            {product.category}
          </Text>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          {product.brand ? (
            <Text style={[styles.brand, { color: colors.textMuted }]} numberOfLines={1}>
              {product.brand}
            </Text>
          ) : null}
          <Text style={[styles.price, { color: colors.text }]}>{formatProductPrice(product)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: '#E2E8F0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    padding: 12,
    gap: 4,
  },
  category: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 36,
  },
  brand: {
    fontSize: 12,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
});
