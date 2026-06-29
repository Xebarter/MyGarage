'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShoppingBag, Wrench, X } from 'lucide-react';

import { CategoryInfiniteFeed } from '@/components/home/category-infinite-feed';
import { CategoryProductCard } from '@/components/home/category-product-card';
import { FeaturedPicksSection, MoreFeaturedSection } from '@/components/home/featured-picks-section';
import { MarketplaceActionStrip } from '@/components/home/marketplace-action-strip';
import { PromoBannerSection } from '@/components/home/promo-banner-section';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import type { Product } from '@/lib/db';
import type { CategoryFeedSection } from '@/lib/home-category-feed';
import { pickFeaturedProducts } from '@/lib/home-category-feed';
import type { HomePromoBanner } from '@/lib/home-initial-data';

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
  initialCategorySections,
  initialCategoryHasMore,
  initialCategoryNextOffset,
}: {
  initialProducts: Product[];
  initialPromoBanners: HomePromoBanner[];
  initialCategorySections: CategoryFeedSection[];
  initialCategoryHasMore: boolean;
  initialCategoryNextOffset: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(() => initialProducts);
  const [loading, setLoading] = useState(() => initialProducts.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);
  const [infiniteLoading, setInfiniteLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [wishlistByProductId, setWishlistByProductId] = useState<Record<string, string>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to fetch products');
      }

      const safeProducts = Array.isArray(data) ? (data as Product[]) : [];
      setProducts(safeProducts);
      setCategories(getRecommendedCategories(safeProducts));
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
      setCategories(['all']);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
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
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
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

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredProducts.length, infiniteLoading, visibleCount]);

  const isDefaultHomeFeed = selectedCategory === 'all' && !searchQuery.trim();
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const featuredProducts = useMemo(() => pickFeaturedProducts(products, 60), [products]);
  const heroFeatured = featuredProducts.slice(0, 5);
  const moreFeatured = featuredProducts.length > 5 ? featuredProducts.slice(5) : [];

  const categoryCatalog = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = p.category?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <MarketplaceActionStrip
          chipCategories={chipCategories}
          categoryCatalog={categoryCatalog}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          showCategoryBrowser={showCategoryBrowser}
        />

        <div className="mx-auto w-full max-w-[1500px] space-y-8 px-2 py-6 sm:px-2.5 md:space-y-10 md:px-3 md:py-8">
          {selectedCategory !== 'all' || searchQuery.trim() ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Showing results for</span>
              {searchQuery.trim() ? (
                <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
                  &ldquo;{searchQuery.trim()}&rdquo;
                </span>
              ) : null}
              {selectedCategory !== 'all' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  {formatCategoryLabel(selectedCategory)}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory('all')}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                    aria-label="Clear category filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
              <p className="mt-4 text-sm font-medium text-foreground">Loading marketplace…</p>
            </div>
          ) : isDefaultHomeFeed ? (
            <div className="space-y-8 md:space-y-10">
              <FeaturedPicksSection products={heroFeatured} />
              <PromoBannerSection
                banners={initialPromoBanners}
                customerId={customerId}
                wishlistByProductId={wishlistByProductId}
                onWishlistChange={handleWishlistChange}
              />
              <MoreFeaturedSection products={moreFeatured} />
              <CategoryInfiniteFeed
                initialSections={initialCategorySections}
                initialHasMore={initialCategoryHasMore}
                initialNextOffset={initialCategoryNextOffset}
              />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
              <p className="mt-4 text-lg font-semibold text-foreground">No matching products found</p>
              <p className="mt-2 text-sm text-muted-foreground">Try a different category or adjust your search.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  router.replace('/');
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Browse all products
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                <div className="border-b border-border/60 px-5 py-4 sm:px-6">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {selectedCategory !== 'all' ? formatCategoryLabel(selectedCategory) : 'Search results'}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6 lg:grid-cols-4">
                  {visibleProducts.map((product, index) => (
                    <CategoryProductCard key={product.id} product={product} imagePriority={index < 4} />
                  ))}
                </div>
                <div ref={sentinelRef} className="h-1 w-full" />
                {infiniteLoading ? (
                  <p className="pb-4 text-center text-xs text-muted-foreground">Loading more products…</p>
                ) : null}
              </section>

              <section className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-primary/[0.06] to-transparent p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
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
      <Footer />
    </>
  );
}
