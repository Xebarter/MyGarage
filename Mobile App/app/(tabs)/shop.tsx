import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import { ShopFilterSheet, type ShopFilters } from '@/components/shop/ShopFilterSheet';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { ShopProductTile } from '@/components/shop/ShopProductTile';
import { ShopPromoCarousel } from '@/components/shop/ShopPromoCarousel';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useColorScheme } from '@/components/useColorScheme';
import {
  addBuyerWishlistItem,
  fetchBuyerWishlist,
  fetchProducts,
  fetchPromoCarousel,
  fetchSearchSuggestions,
  prefetchAddItemsCategories,
  removeBuyerWishlistItem,
} from '@/lib/api';
import type { Product } from '@/types';

const PAGE_SIZE = 12;

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { itemCount, addItem } = useCart();
  const { user, profile } = useAuth();
  const customerId = profile?.customer.id ?? '';

  const [products, setProducts] = useState<Product[]>([]);
  const [promoItems, setPromoItems] = useState<Awaited<ReturnType<typeof fetchPromoCarousel>>>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [wishlistLoadingIds, setWishlistLoadingIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof fetchSearchSuggestions>> | null>(null);
  const [filters, setFilters] = useState<ShopFilters>({
    category: null,
    brand: null,
    priceRange: 'all',
    sortBy: 'featured',
    dealsOnly: false,
    inStockOnly: false,
  });

  const load = useCallback(async () => {
    setError(null);
    void prefetchAddItemsCategories();
    try {
      const [productData, promoData, wishlistData] = await Promise.all([
        fetchProducts(),
        fetchPromoCarousel().catch(() => []),
        customerId ? fetchBuyerWishlist(customerId).catch(() => []) : Promise.resolve([]),
      ]);
      setProducts(productData);
      setPromoItems(promoData);
      setWishlistIds(wishlistData.map((item) => item.productId).filter((id): id is string => Boolean(id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions(null);
      setSuggestionsLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      setSuggestionsLoading(true);
      fetchSearchSuggestions(trimmed)
        .then((data) => setSuggestions(data))
        .catch(() => setSuggestions(null))
        .finally(() => setSuggestionsLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const categories = useMemo(() => {
    const unique = new Set(products.map((p) => p.category?.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const brands = useMemo(() => {
    const unique = new Set(products.map((p) => p.brand?.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b)).slice(0, 18);
  }, [products]);

  const filtered = useMemo(() => {
    const q = (submittedQuery || query).trim().toLowerCase();
    const next = products.filter((product) => {
      if (!product.id || !product.name || !product.createdAt) return false;
      if (filters.category && product.category !== filters.category) return false;
      if (filters.brand && product.brand !== filters.brand) return false;
      if (filters.dealsOnly && !(product.compareAtPrice != null && product.compareAtPrice > product.price)) {
        return false;
      }
      if (filters.inStockOnly && product.variants.length === 0 && product.price <= 0) return false;
      if (!matchesPriceRange(product.price, filters.priceRange)) return false;
      if (!q) return true;

      const haystack = [product.name, product.description, product.category, product.brand, product.tags?.join(' ')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    next.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return b.createdAt.localeCompare(a.createdAt);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'featured':
        default:
          return Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt);
      }
    });

    return next;
  }, [filters, products, query, submittedQuery]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, submittedQuery, query]);

  const loadMoreProducts = useCallback(() => {
    setVisibleCount((count) => {
      if (count >= filtered.length) return count;
      return Math.min(count + PAGE_SIZE, filtered.length);
    });
  }, [filtered.length]);

  const hasMoreProducts = visibleCount < filtered.length;

  const deals = useMemo(
    () => filtered.filter((product) => product.compareAtPrice != null && product.compareAtPrice > product.price).slice(0, 8),
    [filtered],
  );
  const feedProducts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <LoadingView />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <EmptyState
          title="Shop unavailable"
          message={error}
          action={
            <Pressable onPress={() => void load()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        data={feedProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={feedProducts.length > 1 ? styles.gridRow : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <ShopHeader
              searchValue={query}
              onChangeSearch={setQuery}
              onSubmitSearch={() => setSubmittedQuery(query)}
              onOpenCart={() => router.push('/(tabs)/cart')}
              onOpenFilters={() => setShowFilters(true)}
              cartCount={itemCount}
              locationLabel={profile?.customer.address}
              userName={profile?.customer.name}
              resultCount={filtered.length}
              sortLabel={formatSortLabel(filters.sortBy)}
              categories={categories}
              selectedCategory={filters.category}
              onSelectCategory={(category) => setFilters((prev) => ({ ...prev, category }))}
              dealsOnly={filters.dealsOnly}
              onToggleDeals={() => setFilters((prev) => ({ ...prev, dealsOnly: !prev.dealsOnly }))}
            />

            {suggestionsLoading ? (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.infoText, { color: colors.textMuted }]}>Searching…</Text>
              </View>
            ) : suggestions && query.trim().length >= 2 ? (
              <View style={[styles.suggestionsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.suggestionsTitle, { color: colors.textMuted }]}>Suggestions</Text>
                {suggestions.categories.slice(0, 4).map((item) => (
                  <Pressable
                    key={item.name}
                    onPress={() => {
                      setFilters((prev) => ({ ...prev, category: item.name }));
                      setSubmittedQuery(query);
                    }}
                    style={styles.suggestionRow}>
                    <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                    <View style={styles.suggestionCopy}>
                      <Text style={[styles.suggestionTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.suggestionMeta, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.headline}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {promoItems.length > 0 ? (
              <ShopPromoCarousel items={promoItems} />
            ) : null}

            {activeFilterLabels(filters).length > 0 ? (
              <View style={styles.activeFilters}>
                {activeFilterLabels(filters).map((label) => (
                  <Pressable
                    key={label}
                    onPress={resetFilters}
                    style={[styles.activeFilterPill, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
                    <Text style={[styles.activeFilterText, { color: colors.primary }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {deals.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Top deals</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Discounted now</Text>
                </View>
                <FlatList
                  horizontal
                  data={deals}
                  keyExtractor={(item) => `deal-${item.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                  renderItem={({ item }) => (
                    <ShopProductTile
                      product={item}
                      width={190}
                      compact
                      wishlisted={wishlistIds.includes(item.id)}
                      onToggleWishlist={handleToggleWishlist}
                      onAddToCart={handleAddToCart}
                    />
                  )}
                />
              </View>
            ) : null}

            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: colors.text }]}>All products</Text>
              <Text style={[styles.count, { color: colors.textMuted }]}>
                {filtered.length} result{filtered.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.gridItem, index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight]}>
            <ShopProductTile
              product={item}
              width="100%"
              wishlisted={wishlistIds.includes(item.id)}
              onToggleWishlist={handleToggleWishlist}
              onAddToCart={handleAddToCart}
            />
          </View>
        )}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={<EmptyState title="No products found" message="Try another search or category filter." />}
        ListFooterComponent={
          hasMoreProducts ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : filtered.length > 0 ? (
            <View style={styles.footerGap} />
          ) : null
        }
      />
      <ShopFilterSheet
        visible={showFilters}
        categories={categories}
        brands={brands}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onChange={setFilters}
        onReset={resetFilters}
      />
    </SafeAreaView>
  );

  async function handleToggleWishlist(product: Product) {
    if (!user || !customerId) {
      router.push('/(auth)/login');
      return;
    }
    if (wishlistLoadingIds.includes(product.id)) return;

    setWishlistLoadingIds((prev) => [...prev, product.id]);
    const nextWishlisted = !wishlistIds.includes(product.id);
    setWishlistIds((prev) => (nextWishlisted ? [...prev, product.id] : prev.filter((id) => id !== product.id)));

    try {
      if (nextWishlisted) {
        await addBuyerWishlistItem({
          customerId,
          productId: product.id,
          productName: product.name,
          priceSnapshot: product.price,
          categorySnapshot: product.category,
        });
      } else {
        await removeBuyerWishlistItem(customerId, product.id);
      }
    } catch (err) {
      setWishlistIds((prev) => (nextWishlisted ? prev.filter((id) => id !== product.id) : [...prev, product.id]));
      Alert.alert('Wishlist update failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setWishlistLoadingIds((prev) => prev.filter((id) => id !== product.id));
    }
  }

  function handleAddToCart(product: Product) {
    if (product.variants.length > 0) {
      router.push(`/product/${product.id}`);
      return;
    }

    addItem({
      productId: product.id,
      productName: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
    });
    Alert.alert('Added to cart', `${product.name} has been added to your cart.`);
  }

  function resetFilters() {
    setFilters({
      category: null,
      brand: null,
      priceRange: 'all',
      sortBy: 'featured',
      dealsOnly: false,
      inStockOnly: false,
    });
  }
}

function matchesPriceRange(price: number, range: ShopFilters['priceRange']) {
  if (range === 'all') return true;
  if (range === 'budget') return price < 100_000;
  if (range === 'mid') return price >= 100_000 && price <= 500_000;
  return price > 500_000;
}

function formatSortLabel(sortBy: ShopFilters['sortBy']) {
  switch (sortBy) {
    case 'newest':
      return 'Newest';
    case 'price-low':
      return 'Price low-high';
    case 'price-high':
      return 'Price high-low';
    case 'name':
      return 'A-Z';
    case 'featured':
    default:
      return 'Featured';
  }
}

function activeFilterLabels(filters: ShopFilters) {
  const labels: string[] = [];
  if (filters.category) labels.push(filters.category);
  if (filters.brand) labels.push(filters.brand);
  if (filters.priceRange !== 'all') labels.push(`Price: ${filters.priceRange}`);
  if (filters.dealsOnly) labels.push('Deals');
  if (filters.inStockOnly) labels.push('In stock');
  if (filters.sortBy !== 'featured') labels.push(formatSortLabel(filters.sortBy));
  return labels;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  header: {
    gap: 16,
    marginBottom: 4,
  },
  suggestionsPanel: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  suggestionCopy: {
    flex: 1,
    gap: 2,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  count: {
    fontSize: 13,
  },
  horizontalList: {
    gap: 12,
    paddingRight: 16,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilterPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultsHeader: {
    gap: 4,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '50%',
    marginBottom: 12,
  },
  gridItemLeft: {
    paddingRight: 6,
  },
  gridItemRight: {
    paddingLeft: 6,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerGap: {
    height: 12,
  },
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
