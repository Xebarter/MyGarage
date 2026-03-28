'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProductCard } from '@/components/product-card';
import type { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { serviceIntentKeywordsByCategoryId, userServiceCategories } from '@/lib/services-catalog';
import type { UserServiceCategory } from '@/lib/services-catalog';
import { Wrench, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

type HomeCollection = {
  id: string;
  title: string;
  subtitle: string;
  products: Product[];
  serviceTitle: string;
  serviceEmoji: string;
  serviceTopOptions: string[];
};

type RecommendedFeedMeta = {
  feedRank?: number;
  feedScore?: number;
};

const TRUST_BADGES = [
  'Secure checkout',
  'Verified vendors',
  'Fast delivery',
  'Easy returns',
];

function CompactProductTile({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-background transition hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted/25">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{product.name}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-foreground">{formatProductPriceLabel(product)}</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {product.category}
          </span>
        </div>
      </div>
    </Link>
  );
}

function tokenizeProduct(product: Product): string {
  return [product.name, product.description, product.category, product.brand, product.subcategory, ...(product.tags ?? [])]
    .join(' ')
    .toLowerCase();
}

function scoreIntentMatch(product: Product, keywords: string[]): number {
  const haystack = tokenizeProduct(product);
  return keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0);
}

function productFeedWeight(product: Product, indexInFeed: number): number {
  const meta = product as Product & RecommendedFeedMeta;
  const feedScore = typeof meta.feedScore === 'number' && Number.isFinite(meta.feedScore) ? meta.feedScore : 0;
  const feedRank =
    typeof meta.feedRank === 'number' && Number.isFinite(meta.feedRank) && meta.feedRank > 0
      ? meta.feedRank
      : indexInFeed + 1;
  const rankWeight = 1 / Math.max(1, feedRank);
  return Math.max(0.12, rankWeight * 6 + feedScore * 0.12);
}

function recommendationIntentScore(product: Product, keywords: string[], indexInFeed: number): number {
  const intent = scoreIntentMatch(product, keywords);
  if (intent <= 0) return 0;
  return intent * productFeedWeight(product, indexInFeed);
}

/** Service categories ordered by how strongly the current recommendation feed matches each intent. */
function rankUserServiceCategoriesByFeed(products: Product[]): UserServiceCategory[] {
  const scored = userServiceCategories.map((cat, order) => {
    const keywords = serviceIntentKeywordsByCategoryId[cat.id] ?? [];
    let affinity = 0;
    products.forEach((p, i) => {
      affinity += recommendationIntentScore(p, keywords, i);
    });
    return { cat, affinity, order };
  });
  return [...scored]
    .sort((a, b) => b.affinity - a.affinity || a.order - b.order)
    .map((row) => row.cat);
}

function getRecommendedCategories(feedProducts: Product[]): string[] {
  if (feedProducts.length === 0) return ["all"];

  const categoryScores = new Map<string, number>();

  feedProducts.forEach((product, index) => {
    const category = product.category?.trim();
    if (!category) return;

    const meta = product as Product & RecommendedFeedMeta;
    const feedScoreWeight = typeof meta.feedScore === "number" && Number.isFinite(meta.feedScore) ? meta.feedScore : 0;
    const feedRank = typeof meta.feedRank === "number" && Number.isFinite(meta.feedRank) ? meta.feedRank : index + 1;

    // Heavily bias top-ranked recommended products and keep a minimum contribution.
    const rankWeight = 1 / Math.max(1, feedRank);
    const contribution = Math.max(0.2, rankWeight * 8 + feedScoreWeight * 0.15);
    categoryScores.set(category, (categoryScores.get(category) ?? 0) + contribution);
  });

  const suggested = Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category]) => category);

  if (suggested.length === 0) {
    const fallback = Array.from(new Set(feedProducts.map((p) => p.category).filter(Boolean)));
    return ["all", ...fallback];
  }

  return ["all", ...suggested];
}

function HomePageInner() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);
  const [infiniteLoading, setInfiniteLoading] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [bannerFading, setBannerFading] = useState(false);
  const [promoBanners, setPromoBanners] = useState<Array<{ id: string; product: Product; bannerUrl: string }>>([]);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchPromoCarousel();
  }, []);

  // Amazon-like behavior: when `q` changes, refresh the recommendation feed
  // so search results update beyond just local filtering.
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && cat.trim()) {
      setSelectedCategory(cat.trim());
    } else {
      setSelectedCategory('all');
    }
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    } else {
      setSearchQuery('');
    }
  }, [searchParams]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  // Reset infinite scroll window when the user changes filters.
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
      { root: null, rootMargin: "1000px", threshold: 0.01 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredProducts.length, infiniteLoading, visibleCount]);

  useEffect(() => {
    if (promoBanners.length <= 1) return;
    const FADE_MS = 350;
    const ROTATE_MS = 7500;

    const timer = window.setInterval(() => {
      setBannerFading(true);
      window.setTimeout(() => {
        setActiveBannerIndex((prev) => (prev + 1) % promoBanners.length);
        // Allow the new banner to render before fading back in.
        window.setTimeout(() => setBannerFading(false), 20);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [promoBanners]);

  useEffect(() => {
    rowRefs.current = {};
  }, [products, categories, selectedCategory, searchQuery]);

  async function fetchProducts() {
    try {
      const customerEmail =
        typeof window !== 'undefined' ? (localStorage.getItem('currentBuyerEmail') || '').trim() : '';
      // forceRefresh=1 ensures the DB recommendation snapshot is regenerated on each page load.
      const query = customerEmail
        ? `?customerEmail=${encodeURIComponent(customerEmail)}&limit=300&forceRefresh=1`
        : '?limit=300&forceRefresh=1';
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

  async function fetchPromoCarousel() {
    try {
      const res = await fetch("/api/promo-carousel");
      const data = await res.json();
      const safe = Array.isArray(data)
        ? (data as Array<{ id: string; product: Product; bannerUrl: string }>)
        : [];
      setPromoBanners(safe);
      setActiveBannerIndex(0);
    } catch {
      setPromoBanners([]);
    }
  }

  function filterProducts() {
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
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }

  const bannerItems = promoBanners.slice(0, 5);
  const activeBannerItem = bannerItems[activeBannerIndex % Math.max(bannerItems.length, 1)];
  const activeBannerProduct = activeBannerItem?.product;
  const displayedProducts = filteredProducts;
  const visibleProducts = displayedProducts.slice(0, visibleCount);
  const isDefaultHomeFeed = selectedCategory === 'all' && !searchQuery.trim();

  const feedOrderedServiceCategories = useMemo(
    () => rankUserServiceCategoriesByFeed(products),
    [products],
  );

  const smartCollections = useMemo<HomeCollection[]>(() => {
    if (!isDefaultHomeFeed) return [];

    const usedProductIds = new Set<string>();
    const built: HomeCollection[] = [];

    for (const serviceCategory of feedOrderedServiceCategories) {
      const keywords = serviceIntentKeywordsByCategoryId[serviceCategory.id] ?? [];
      if (keywords.length === 0) continue;

      const ranked = products
        .map((product, indexInFeed) => ({
          product,
          score: recommendationIntentScore(product, keywords, indexInFeed),
        }))
        .filter((item) => item.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            Number(b.product.featured) - Number(a.product.featured) ||
            a.product.name.localeCompare(b.product.name),
        )
        .map((item) => item.product)
        .filter((product) => !usedProductIds.has(product.id))
        .slice(0, 8);

      if (ranked.length < 3) continue;
      ranked.forEach((product) => usedProductIds.add(product.id));

      built.push({
        id: serviceCategory.id,
        title: serviceCategory.title,
        subtitle: serviceCategory.useWhen,
        products: ranked,
        serviceTitle: serviceCategory.title,
        serviceEmoji: serviceCategory.emoji,
        serviceTopOptions: serviceCategory.services.slice(0, 3),
      });

      if (built.length >= 4) break;
    }

    if (built.length === 0) {
      const fallback = [...products]
        .map((product, indexInFeed) => ({
          product,
          w: productFeedWeight(product, indexInFeed),
        }))
        .sort((a, b) => b.w - a.w || Number(b.product.featured) - Number(a.product.featured))
        .slice(0, 8)
        .map((row) => row.product);
      if (fallback.length > 0) {
        built.push({
          id: 'recommended-products',
          title: 'Recommended For You',
          subtitle: 'Top picks from your personalized feed — pair with a service when you need help',
          products: fallback,
          serviceTitle: 'Quick Service Request',
          serviceEmoji: '🛠',
          serviceTopOptions: ['Oil change', 'Brake check', 'Battery check'],
        });
      }
    }

    return built;
  }, [isDefaultHomeFeed, products, feedOrderedServiceCategories]);

  const dealProducts = useMemo(() => {
    return [...products].sort((a, b) => a.price - b.price).slice(0, 8);
  }, [products]);

  function scrollRow(rowKey: string, direction: 'left' | 'right') {
    const row = rowRefs.current[rowKey];
    if (!row) return;

    const distance = Math.max(320, Math.floor(row.clientWidth * 0.85));
    row.scrollBy({
      left: direction === 'right' ? distance : -distance,
      behavior: 'smooth',
    });
  }

  return (
    <>
      <Header />
      <main className="bg-background">
        {/* Product Ad Banner Section */}
        <section className="bg-background py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {!activeBannerProduct ? (
              <div className="rounded-2xl border border-border bg-card p-3 md:p-4 shadow-sm min-h-[150px] md:h-[210px]">
                <div className="h-full flex flex-col justify-center">
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground mb-1.5 md:mb-2 leading-tight">
                    New Product Ads Coming Soon
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Add promoted products and upload banners in /admin/promotions to display them here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-3 md:p-4 shadow-sm flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 md:gap-4 items-center">
                  <div className="md:col-span-4 flex flex-col justify-center order-2 md:order-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="text-[11px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Sponsored
                      </span>
                      <span className="text-[11px] uppercase tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                        Fast delivery
                      </span>
                    </div>

                    <h1 className="text-base sm:text-lg md:text-xl font-extrabold text-foreground mb-1 line-clamp-1 leading-tight">
                      {activeBannerProduct.name}
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 max-w-xl line-clamp-1">
                      Top pick in {activeBannerProduct.category}.
                    </p>

                    <div className="flex items-center gap-2 sm:gap-2.5 mb-2">
                      <span className="text-base sm:text-lg font-bold text-foreground">
                        {formatProductPriceLabel(activeBannerProduct)}
                      </span>
                      <span className="text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-full">
                        {activeBannerProduct.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-1.5">
                      <Link
                        href={`/products/${activeBannerProduct.id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs sm:text-sm font-semibold hover:bg-primary/90 transition"
                      >
                        Get it now
                      </Link>
                      <Link
                        href={`/products/${activeBannerProduct.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-accent transition"
                      >
                        See details
                      </Link>
                    </div>

                    <p className="hidden md:block text-[11px] text-muted-foreground">
                      Quality parts. Easy returns. Secure checkout.
                    </p>
                  </div>

                  <div className="md:col-span-8 order-1 md:order-2">
                    {/* Frame matches 1600×450 promo assets (32∶9) */}
                    <div className="relative aspect-[1600/450] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/10 via-transparent to-black/5" />
                      <img
                        src={activeBannerItem?.bannerUrl || activeBannerProduct.image}
                        alt={activeBannerProduct.name}
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out ${
                          bannerFading ? 'opacity-0' : 'opacity-100'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {bannerItems.length > 1 ? (
                  <div className="mt-2 md:mt-2.5 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Banner {activeBannerIndex + 1} of {bannerItems.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {bannerItems.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveBannerIndex(index)}
                          aria-label={`Show banner ${index + 1}`}
                          className={`h-2.5 rounded-full transition ${
                            index === activeBannerIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        {/* Search and Filter Section */}
        <section className="bg-card py-8 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg transition font-medium ${
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Trust and deal strip */}
        <section className="border-b border-border bg-background/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-8 flex flex-wrap items-center gap-2">
                {TRUST_BADGES.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <div className="md:col-span-4 flex items-center justify-start md:justify-end">
                <Link
                  href="/buyer/services"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Book a Service Now
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Amazon-like discovery sections */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {selectedCategory === 'all' && !searchQuery.trim()
                  ? 'No products available in the recommendation feed yet.'
                  : 'No products found matching your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg md:text-xl font-semibold">Budget Deals Under Control</h2>
                  <p className="text-xs text-muted-foreground">Low-price picks from your current recommendation feed</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {dealProducts.slice(0, 4).map((product) => (
                    <CompactProductTile key={`deal-${product.id}`} product={product} />
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-8">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-wide font-semibold">Smart Picks</p>
                  </div>
                  <h2 className="mt-2 text-2xl md:text-3xl font-bold">
                    {selectedCategory !== 'all' ? selectedCategory : 'Top Deals & Essentials'}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Showing {displayedProducts.length} curated product{displayedProducts.length !== 1 ? 's' : ''} for this feed.
                  </p>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {visibleProducts.slice(0, 6).map((product) => (
                      <CompactProductTile key={`tile-${product.id}`} product={product} />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Wrench className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-wide font-semibold">Services Near You</p>
                  </div>
                  <h3 className="mt-2 text-xl font-bold">Book Car Services Fast</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Categories below follow your recommendation feed — jump in where your shopping suggests you’ll need
                    help next.
                  </p>
                  <div className="mt-4 space-y-2">
                    {feedOrderedServiceCategories.slice(0, 5).map((serviceCategory) => (
                      <Link
                        key={`service-feature-${serviceCategory.id}`}
                        href={`/buyer/services?sc=${encodeURIComponent(serviceCategory.id)}&quick=1`}
                        className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-accent/40 transition"
                      >
                        <span className="truncate">
                          {serviceCategory.emoji} {serviceCategory.title}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              </section>

              {isDefaultHomeFeed ? (
                <div className="space-y-10">
                  {smartCollections.map((collection) => (
                    <section key={collection.id} className="rounded-2xl border border-border bg-card p-4 md:p-5">
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-xl md:text-2xl font-semibold">
                            {collection.serviceEmoji} {collection.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">{collection.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => scrollRow(collection.id, 'left')}
                            className="h-9 w-9 rounded-full border border-border bg-background text-foreground hover:bg-accent transition"
                            aria-label={`Scroll ${collection.title} left`}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollRow(collection.id, 'right')}
                            className="h-9 w-9 rounded-full border border-border bg-background text-foreground hover:bg-accent transition"
                            aria-label={`Scroll ${collection.title} right`}
                          >
                            →
                          </button>
                        </div>
                      </div>

                      <div className="mb-4 rounded-xl border border-border bg-background/80 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Pair products with trusted service requests
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Try: {collection.serviceTopOptions.join(' • ')}
                        </p>
                        <Link
                          href={
                            collection.id === 'recommended-products'
                              ? '/buyer/services'
                              : `/buyer/services?sc=${encodeURIComponent(collection.id)}&quick=1`
                          }
                          className="mt-2 inline-flex items-center text-xs font-semibold text-primary hover:underline"
                        >
                          Request this kind of service
                        </Link>
                      </div>

                      <div
                        ref={(node) => {
                          rowRefs.current[collection.id] = node;
                        }}
                        className="flex flex-nowrap gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
                      >
                        {collection.products.map((product) => (
                          <div key={`${collection.id}-${product.id}`} className="w-[82vw] sm:w-[300px] md:w-[320px] flex-none snap-start">
                            <CompactProductTile product={product} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                  <section className="rounded-2xl border border-border bg-card p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-lg md:text-xl font-semibold">More for you</h2>
                      <p className="text-xs text-muted-foreground">
                        Showing {visibleProducts.length} of {filteredProducts.length}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {visibleProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                    <div ref={sentinelRef} className="h-1 w-full" />
                  </section>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {visibleProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                  <div ref={sentinelRef} className="h-1 w-full" />
                </>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className="flex min-h-[45vh] flex-col items-center justify-center gap-2 bg-background px-4 text-center">
            <p className="text-sm font-medium text-foreground">Loading storefront…</p>
            <p className="text-xs text-muted-foreground">Preparing products and filters.</p>
          </main>
          <Footer />
        </>
      }
    >
      <HomePageInner />
    </Suspense>
  );
}
