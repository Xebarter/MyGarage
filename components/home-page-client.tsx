'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShoppingBag, Wrench, X } from 'lucide-react';

import { CategoryInfiniteFeed } from '@/components/home/category-infinite-feed';
import { CategoryProductCard } from '@/components/home/category-product-card';
import { DesktopHomeHero } from '@/components/home/desktop-home-hero';
import { DesktopShopCategories, type DepartmentTile } from '@/components/home/desktop-shop-categories';
import { DesktopTrustBar } from '@/components/home/desktop-trust-bar';
import { FeaturedPicksSection, MoreFeaturedSection } from '@/components/home/featured-picks-section';
import { MarketplaceActionStrip } from '@/components/home/marketplace-action-strip';
import { MobileShopHome } from '@/components/home/mobile-shop-home';
import { PromoBannerSection } from '@/components/home/promo-banner-section';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import type { Product } from '@/lib/db';
import { pickFeaturedProducts } from '@/lib/home-category-feed';
import type { HomePromoBanner } from '@/lib/home-initial-data';
import { buildExpandedRankingTokens, expandTokenVariants, normalizeSearchText } from '@/lib/search/expand-query';

type RecommendedFeedMeta = {
  feedRank?: number;
  feedScore?: number;
};

function topCategoriesByFrequency(feedProducts: Product[], limit: number): string[] {
  const counts = new Map<string, number>();
  feedProducts.forEach((p) => {
    const c = p.category?.trim();
    if (!c) return;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([c]) => c);
}

function getRecommendedCategories(feedProducts: Product[]): string[] {
  if (feedProducts.length === 0) return ['all'];

  const categoryScores = new Map<string, number>();
  feedProducts.forEach((product, index) => {
    const category = product.category?.trim();
    if (!category) return;

    const meta = product as Product & RecommendedFeedMeta;
    const feedScoreWeight = typeof meta.feedScore === 'number' && Number.isFinite(meta.feedScore) ? meta.feedScore : 0;
    const feedRank = typeof meta.feedRank === 'number' && Number.isFinite(meta.feedRank) ? meta.feedRank : index + 1;
    const rankWeight = 1 / Math.max(1, feedRank);
    const contribution = Math.max(0.2, rankWeight * 8 + feedScoreWeight * 0.15);
    categoryScores.set(category, (categoryScores.get(category) ?? 0) + contribution);
  });

  const suggested = Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category]) => category);

  if (suggested.length === 0) {
    const fallback = topCategoriesByFrequency(feedProducts, 12);
    return ['all', ...fallback];
  }

  return ['all', ...suggested];
}

function formatCategoryLabel(category: string): string {
  if (category === 'all') return 'All';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function HomePageClient({
  initialProducts,
  initialPromoBanners,
}: {
  initialProducts: Product[];
  initialPromoBanners: HomePromoBanner[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(() => initialProducts);
  const [loading, setLoading] = useState(() => initialProducts.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>(() => getRecommendedCategories(initialProducts));
  const [visibleCount, setVisibleCount] = useState(24);
  const [infiniteLoading, setInfiniteLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [wishlistByProductId, setWishlistByProductId] = useState<Record<string, string>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const mobileSentinelRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<number | null>(null);

  const refreshWishlist = useCallback(async (cid: string) => {
    try {
      const res = await fetch(`/api/buyer/wishlist?customerId=${encodeURIComponent(cid)}`);
      if (!res.ok) {
        setWishlistByProductId({});
        return;
      }
      const data = (await res.json()) as Array<{ id?: string; productId?: string }>;
      const map: Record<string, string> = {};
      for (const item of Array.isArray(data) ? data : []) {
        if (item.productId && item.id) map[item.productId] = item.id;
      }
      setWishlistByProductId(map);
    } catch {
      setWishlistByProductId({});
    }
  }, []);

  const handleWishlistChange = useCallback((next: { productId: string; wishlistItemId: string | null }) => {
    setWishlistByProductId((prev) => {
      const copy = { ...prev };
      if (next.wishlistItemId) copy[next.productId] = next.wishlistItemId;
      else delete copy[next.productId];
      return copy;
    });
  }, []);

  useEffect(() => {
    void (async () => {
      const localId = typeof window !== 'undefined' ? localStorage.getItem('currentBuyerId') || '' : '';
      const email =
        typeof window !== 'undefined' ? (localStorage.getItem('currentBuyerEmail') || '').trim() : '';
      let resolved = localId;
      try {
        if (!resolved && email) {
          const r = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
          if (r.ok) {
            const c = (await r.json()) as { id?: string };
            if (c?.id) {
              resolved = c.id;
              localStorage.setItem('currentBuyerId', resolved);
            }
          }
        }
      } catch {
        /* ignore */
      }
      const nextId = resolved || null;
      setCustomerId(nextId);
      if (nextId) await refreshWishlist(nextId);
      else setWishlistByProductId({});
    })();
  }, [refreshWishlist]);

  useEffect(() => {
    void fetchProducts();
  }, []);

  useEffect(() => {
    void fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && cat.trim()) setSelectedCategory(cat.trim());
    else setSelectedCategory('all');

    const q = searchParams.get('q');
    setSearchQuery(q !== null ? q : '');
  }, [searchParams]);

  async function fetchProducts() {
    try {
      const customerEmail =
        typeof window !== 'undefined' ? (localStorage.getItem('currentBuyerEmail') || '').trim() : '';
      const query = customerEmail
        ? `?customerEmail=${encodeURIComponent(customerEmail)}&limit=300`
        : '?limit=300';
      const response = await fetch(`/api/feed${query}`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error('Failed to fetch products');
      }
      const data: unknown = await response.json();

      const safeProducts = Array.isArray(data) ? (data as Product[]) : [];
      setProducts(safeProducts);
      setCategories(getRecommendedCategories(safeProducts));
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery.trim()) {
      const safeQ = normalizeSearchText(searchQuery);
      const { primaryTokens, dbTokenGroups } = buildExpandedRankingTokens(safeQ);
      const groups =
        dbTokenGroups.length > 0
          ? dbTokenGroups
          : safeQ.length >= 2
            ? [expandTokenVariants(safeQ)]
            : [];

      filtered = filtered.filter((p) => {
        const hay = [
          p.name,
          p.description,
          p.category,
          p.brand,
          p.subcategory,
          p.sku,
          ...(p.tags ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (safeQ.length >= 2 && hay.includes(safeQ)) return true;
        if (groups.length === 0) return false;

        return groups.every((variants) => variants.some((v) => v.length >= 2 && hay.includes(v)));
      });
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    return filtered;
  }, [products, searchQuery, selectedCategory]);

  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const sentinels = [sentinelRef.current, mobileSentinelRef.current].filter(
      (el): el is HTMLDivElement => Boolean(el),
    );
    if (sentinels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) return;
        if (infiniteLoading) return;
        if (visibleCount >= filteredProducts.length) return;

        setInfiniteLoading(true);
        window.setTimeout(() => {
          setVisibleCount((c) => Math.min(filteredProducts.length, c + 24));
          setInfiniteLoading(false);
        }, 200);
      },
      { root: null, rootMargin: '1000px', threshold: 0.01 },
    );

    sentinels.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredProducts.length, infiniteLoading, visibleCount]);

  const isDefaultHomeFeed = selectedCategory === 'all' && !searchQuery.trim();
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const featuredProducts = useMemo(() => pickFeaturedProducts(products, 60), [products]);
  const heroFeatured = featuredProducts.slice(0, 3);
  const moreFeatured = featuredProducts.length > 3 ? featuredProducts.slice(3) : [];
  const heroProduct = featuredProducts[0] ?? products[0] ?? null;

  const categoryCatalog = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = p.category?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const shopCategories = useMemo(() => topCategoriesByFrequency(products, products.length), [products]);

  const departmentTiles = useMemo((): DepartmentTile[] => {
    const stats = new Map<string, { count: number; image: string }>();
    for (const product of products) {
      const category = product.category?.trim();
      if (!category) continue;
      const existing = stats.get(category);
      if (!existing) {
        stats.set(category, { count: 1, image: product.image });
      } else {
        existing.count += 1;
      }
    }
    return shopCategories
      .map((category) => {
        const entry = stats.get(category);
        if (!entry) return null;
        return { category, count: entry.count, image: entry.image };
      })
      .filter((tile): tile is DepartmentTile => tile !== null);
  }, [products, shopCategories]);

  const chipCategories = useMemo(() => {
    const raw = categories.length ? categories : ['all'];
    const withoutAll = raw.filter((c) => c !== 'all');
    const ordered = ['all', ...withoutAll];
    if (selectedCategory !== 'all' && !ordered.includes(selectedCategory)) {
      return ['all', selectedCategory, ...withoutAll.filter((c) => c !== selectedCategory)];
    }
    return ordered;
  }, [categories, selectedCategory]);

  const chipsProductCount = chipCategories.filter((c) => c !== 'all').length;
  const showCategoryBrowser = categoryCatalog.length > chipsProductCount;

  function handleSelectCategory(category: string) {
    setSelectedCategory(category);
    const params = new URLSearchParams(searchParams.toString());
    if (category === 'all') params.delete('category');
    else params.set('category', category);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/');
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const next = value.trim();
      if (next) params.set('q', next);
      else params.delete('q');
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : '/');
    }, 250);
  }

  function handleResetFilters() {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    setSearchQuery('');
    setSelectedCategory('all');
    router.replace('/');
  }

  return (
    <>
      <Header />
      <MobileShopHome
        products={filteredProducts}
        visibleProducts={visibleProducts}
        categories={shopCategories}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        loading={loading}
        infiniteLoading={infiniteLoading}
        sentinelRef={mobileSentinelRef}
        onSelectCategory={handleSelectCategory}
        onSearchChange={handleSearchChange}
        onReset={handleResetFilters}
      />

      <div className="hidden md:contents">
      <main className="min-h-screen bg-[#F7F8FB]">
        {isDefaultHomeFeed && !loading ? (
          <>
            <DesktopHomeHero
              featuredProduct={heroProduct}
              productCount={products.length}
              departmentCount={categoryCatalog.length}
            />
            <DesktopTrustBar />
          </>
        ) : null}

        <MarketplaceActionStrip
          chipCategories={chipCategories}
          categoryCatalog={categoryCatalog}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          showCategoryBrowser={showCategoryBrowser}
        />

        <div className="mx-auto w-full max-w-[1500px] space-y-14 px-4 py-10 sm:px-5 md:px-6 lg:space-y-16 lg:px-8 lg:py-14">
          {selectedCategory !== 'all' || searchQuery.trim() ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Showing results for</span>
              {searchQuery.trim() ? (
                <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border">
                  &ldquo;{searchQuery.trim()}&rdquo;
                </span>
              ) : null}
              {selectedCategory !== 'all' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {formatCategoryLabel(selectedCategory)}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory('all')}
                    className="rounded p-0.5 hover:bg-primary/20"
                    aria-label="Clear category filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
              <p className="mt-4 text-sm font-medium text-foreground">Loading marketplace…</p>
            </div>
          ) : isDefaultHomeFeed ? (
            <div className="space-y-14 lg:space-y-16">
              <DesktopShopCategories
                tiles={departmentTiles}
                onSelectCategory={handleSelectCategory}
              />
              <FeaturedPicksSection products={heroFeatured} />
              <PromoBannerSection
                banners={initialPromoBanners}
                customerId={customerId}
                wishlistByProductId={wishlistByProductId}
                onWishlistChange={handleWishlistChange}
              />
              <MoreFeaturedSection products={moreFeatured} />
              <CategoryInfiniteFeed products={products} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="px-4 py-20 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden />
              <p className="mt-4 text-lg font-semibold text-foreground">No matching products found</p>
              <p className="mt-2 text-sm text-muted-foreground">Try a different category or adjust your search.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  router.replace('/');
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Browse all products
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              <section>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                      {selectedCategory !== 'all' ? formatCategoryLabel(selectedCategory) : 'Search results'}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
                  {visibleProducts.map((product, index) => (
                    <CategoryProductCard
                      key={product.id}
                      product={product}
                      toneIndex={index}
                      imagePriority={index < 4}
                    />
                  ))}
                </div>
                <div ref={sentinelRef} className="h-1 w-full" />
                {infiniteLoading ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Loading more products…</p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-black/[0.06] bg-white px-5 py-6 sm:px-7 sm:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Wrench className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Need installation or repair?</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Book a trusted garage service to go with the parts you&apos;re browsing.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/buyer/services"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Browse services
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
      </div>
      <Footer />
    </>
  );
}
