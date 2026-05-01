'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProductCard } from '@/components/product-card';
import { ProductWishlistButton } from '@/components/product-wishlist-button';
import type { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { serviceIntentKeywordsByCategoryId, userServiceCategories } from '@/lib/services-catalog';
import type { UserServiceCategory } from '@/lib/services-catalog';
import { Wrench, Sparkles, ShieldCheck, ArrowRight, LayoutGrid, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { getDepartmentTitles, resolveDepartmentForProductCategory } from '@/data/sidebar-categories';
import { cn } from '@/lib/utils';
import { ProductImage } from '@/components/product-image';
import type { HomePromoBanner } from '@/lib/home-initial-data';

const MORE_FOR_YOU_OTHER_LABEL = 'Other';

type MoreForYouDepartmentSection = { title: string; products: Product[] };

type MoreForYouLayoutBlock =
  | { kind: 'multi'; section: MoreForYouDepartmentSection }
  | { kind: 'singleRow'; sections: MoreForYouDepartmentSection[] };

function moreForYouDepartmentGridClass(productCount: number): string {
  return cn(
    'grid gap-2.5 sm:gap-3 md:gap-4',
    productCount === 1 && 'grid-cols-1',
    productCount === 2 && 'grid-cols-2 lg:grid-cols-2',
    productCount === 3 && 'grid-cols-2 lg:grid-cols-3',
    productCount >= 4 && 'grid-cols-2 lg:grid-cols-3',
  );
}

function moreForYouProductCellClass(index: number, productCount: number): string {
  return cn(
    productCount === 3 && index === 2 && 'col-span-2 lg:col-span-1',
    productCount === 4 && index === 3 && 'lg:hidden',
  );
}

/**
 * Extend a short row (1–2 single-product departments) toward 3 cards using other single-product
 * departments from `pool` in catalog order. No category title appears twice on the same row.
 */
function padSingleRowDistinct(
  remainder: MoreForYouDepartmentSection[],
  pool: MoreForYouDepartmentSection[],
): MoreForYouDepartmentSection[] {
  if (remainder.length === 0) return [];
  const row = [...remainder];
  const usedTitles = new Set(row.map((s) => s.title));

  for (const candidate of pool) {
    if (row.length >= 3) break;
    if (usedTitles.has(candidate.title)) continue;
    row.push(candidate);
    usedTitles.add(candidate.title);
  }

  return row;
}

/**
 * Peel full triples from the singles buffer into `singleRow` blocks. Before each multi-product
 * section, flush leftovers padded with distinct singles from the full list (never duplicate a title
 * on one row). Rows may have 1–3 cards if fewer than 3 unique single-product departments exist.
 */
function buildMoreForYouLayout(sections: MoreForYouDepartmentSection[]): MoreForYouLayoutBlock[] {
  const allSingles = sections.filter((s) => s.products.length === 1);
  const blocks: MoreForYouLayoutBlock[] = [];
  const buffer: MoreForYouDepartmentSection[] = [];

  const flushSinglesBeforeMulti = () => {
    while (buffer.length >= 3) {
      blocks.push({ kind: 'singleRow', sections: buffer.splice(0, 3) });
    }
    if (buffer.length > 0) {
      blocks.push({ kind: 'singleRow', sections: padSingleRowDistinct([...buffer], allSingles) });
      buffer.length = 0;
    }
  };

  for (const section of sections) {
    if (section.products.length === 1) {
      buffer.push(section);
      continue;
    }
    flushSinglesBeforeMulti();
    blocks.push({ kind: 'multi', section });
  }

  flushSinglesBeforeMulti();
  return blocks;
}

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

function CompactProductTile({
  product,
  customerId,
  wishlistItemId,
  onWishlistChange,
  imagePriority = false,
}: {
  product: Product;
  customerId: string | null;
  wishlistItemId: string | null;
  onWishlistChange: (next: { productId: string; wishlistItemId: string | null }) => void;
  imagePriority?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-background transition hover:shadow-md">
      <ProductWishlistButton
        product={product}
        customerId={customerId}
        savedWishlistItemId={wishlistItemId}
        onUpdate={onWishlistChange}
        className="absolute right-2 top-2 z-10"
      />
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/25">
          <ProductImage
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
            priority={imagePriority}
          />
        </div>
        <div className="p-3">
          <p className="line-clamp-1 text-sm font-medium text-foreground">{product.name}</p>
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 shrink text-sm font-bold tabular-nums text-foreground">
              {formatProductPriceLabel(product)}
            </p>
            <span
              title={product.category}
              className="max-w-[45%] shrink-0 truncate rounded-full bg-primary/10 px-2 py-0.5 text-right text-[10px] font-medium text-primary"
            >
              {product.category}
            </span>
          </div>
        </div>
      </Link>
    </div>
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

/** Product categories sorted by frequency, then name — always capped for UI sanity. */
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
    // Never return an unbounded list — huge catalogs used to wrap across the entire viewport.
    const fallback = topCategoriesByFrequency(feedProducts, 12);
    return ["all", ...fallback];
  }

  return ["all", ...suggested];
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
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(() => initialProducts);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(() => initialProducts);
  const [loading, setLoading] = useState(() => initialProducts.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);
  const [infiniteLoading, setInfiniteLoading] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [bannerFading, setBannerFading] = useState(false);
  const promoBanners = initialPromoBanners;
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const categoryRailRef = useRef<HTMLDivElement | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [wishlistByProductId, setWishlistByProductId] = useState<Record<string, string>>({});

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
    fetchProducts();
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

  const moreForYouDepartmentSections = useMemo(() => {
    const slice = filteredProducts.slice(0, visibleCount);
    const buckets = new Map<string, Product[]>();
    for (const title of getDepartmentTitles()) {
      buckets.set(title, []);
    }
    buckets.set(MORE_FOR_YOU_OTHER_LABEL, []);

    for (const product of slice) {
      const dept =
        resolveDepartmentForProductCategory(product.category) ?? MORE_FOR_YOU_OTHER_LABEL;
      const list = buckets.get(dept);
      if (list && list.length < 4) list.push(product);
    }

    const sections: { title: string; products: Product[] }[] = [];
    for (const title of getDepartmentTitles()) {
      const products = buckets.get(title) ?? [];
      if (products.length > 0) sections.push({ title, products });
    }
    const other = buckets.get(MORE_FOR_YOU_OTHER_LABEL) ?? [];
    if (other.length > 0) sections.push({ title: MORE_FOR_YOU_OTHER_LABEL, products: other });
    return sections;
  }, [filteredProducts, visibleCount]);

  const moreForYouLayout = useMemo(() => {
    return buildMoreForYouLayout(moreForYouDepartmentSections);
  }, [moreForYouDepartmentSections]);

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

  /** Full list for searchable picker — alphabetical, deduped. */
  const categoryCatalog = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = p.category?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  /** Quick rail: recommended chips plus deep-linked category if missing. */
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
          <div className="mx-auto w-full max-w-none px-2 sm:px-2.5 md:px-3">
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
                    <div className="mb-1.5 flex items-center gap-2">
                      <ProductWishlistButton
                        product={activeBannerProduct}
                        customerId={customerId}
                        savedWishlistItemId={wishlistByProductId[activeBannerProduct.id] ?? null}
                        onUpdate={handleWishlistChange}
                        className="h-8 w-8"
                      />
                      <span className="text-[11px] text-muted-foreground">Save to wishlist</span>
                    </div>

                    <p className="hidden md:block text-[11px] text-muted-foreground">
                      Quality parts. Easy returns. Secure checkout.
                    </p>
                  </div>

                  <div className="md:col-span-8 order-1 md:order-2">
                    {/* Frame matches 1600×450 promo assets (32∶9) */}
                    <div className="relative aspect-[1600/450] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/10 via-transparent to-black/5" />
                      <ProductImage
                        src={activeBannerItem?.bannerUrl || activeBannerProduct.image}
                        alt={activeBannerProduct.name}
                        fill
                        className={`object-cover transition-opacity duration-500 ease-in-out ${
                          bannerFading ? 'opacity-0' : 'opacity-100'
                        }`}
                        sizes="(max-width: 768px) 100vw, 66vw"
                        priority={activeBannerIndex === 0}
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
                          className={`h-2.5 rounded-full transition ${index === activeBannerIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70'
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

        {/* Search and Filter Section — compact rail + searchable overflow */}
        <section className="border-b border-border bg-card py-4 md:py-5">
          <div className="mx-auto w-full max-w-none px-2 sm:px-2.5 md:px-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-sm font-semibold tracking-tight text-foreground">Shop by category</p>
                {categoryCatalog.length > 0 ? (
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {categoryCatalog.length} in catalog
                  </span>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-card to-transparent sm:w-8"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-card to-transparent sm:w-8"
                    aria-hidden
                  />
                  <div
                    ref={categoryRailRef}
                    role="tablist"
                    aria-label="Product categories"
                    className="flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {chipCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        role="tab"
                        aria-selected={selectedCategory === category}
                        onClick={() => setSelectedCategory(category)}
                        className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${selectedCategory === category
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-accent hover:text-accent-foreground'
                          }`}
                      >
                        {formatCategoryLabel(category)}
                      </button>
                    ))}
                  </div>
                </div>

                {showCategoryBrowser ? (
                  <Popover open={categoryMenuOpen} onOpenChange={setCategoryMenuOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 gap-1.5 rounded-full border-dashed px-3 text-xs font-semibold sm:text-sm"
                      >
                        <LayoutGrid className="h-3.5 w-3.5 opacity-70" aria-hidden />
                        <span className="hidden sm:inline">All categories</span>
                        <span className="sm:hidden">More</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-[min(calc(100vw-2rem),22rem)] p-0"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <Command className="rounded-lg border-0 shadow-none">
                        <CommandInput placeholder="Search categories…" className="h-10" />
                        <CommandList className="max-h-[min(50vh,280px)]">
                          <CommandEmpty>No matching category.</CommandEmpty>
                          <CommandGroup heading="Quick">
                            <CommandItem
                              value="all everything browse"
                              onSelect={() => {
                                setSelectedCategory('all');
                                setCategoryMenuOpen(false);
                                categoryRailRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
                              }}
                            >
                              All products
                            </CommandItem>
                          </CommandGroup>
                          <CommandGroup heading={`All categories (${categoryCatalog.length})`}>
                            {categoryCatalog.map((category) => (
                              <CommandItem
                                key={category}
                                value={`${category} ${category.toLowerCase()}`}
                                onSelect={() => {
                                  setSelectedCategory(category);
                                  setCategoryMenuOpen(false);
                                }}
                              >
                                {formatCategoryLabel(category)}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
            </div>

            {selectedCategory !== 'all' ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <span>Filtered to</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  {formatCategoryLabel(selectedCategory)}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                    aria-label="Clear category filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            ) : null}
          </div>
        </section>

        {/* Trust and deal strip */}
        <section className="border-b border-border bg-background/70">
          <div className="mx-auto w-full max-w-none px-2 sm:px-2.5 md:px-3 py-4">
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
        <section className="mx-auto w-full max-w-none px-2 sm:px-2.5 md:px-3 py-10">
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
              <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg md:text-xl font-semibold">Budget Deals Under Control</h2>
                  <p className="text-xs text-muted-foreground">Low-price picks from your current recommendation feed</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {dealProducts.slice(0, 4).map((product, di) => (
                    <CompactProductTile
                      key={`deal-${product.id}`}
                      product={product}
                      customerId={customerId}
                      wishlistItemId={wishlistByProductId[product.id] ?? null}
                      onWishlistChange={handleWishlistChange}
                      imagePriority={di < 2}
                    />
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 lg:col-span-8">
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
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {visibleProducts.slice(0, 6).map((product, ti) => (
                      <CompactProductTile
                        key={`tile-${product.id}`}
                        product={product}
                        customerId={customerId}
                        wishlistItemId={wishlistByProductId[product.id] ?? null}
                        onWishlistChange={handleWishlistChange}
                        imagePriority={ti < 3}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 lg:col-span-4">
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
                    <section key={collection.id} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
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
                        {collection.products.map((product, ci) => (
                          <div key={`${collection.id}-${product.id}`} className="w-[82vw] sm:w-[300px] md:w-[320px] flex-none snap-start">
                            <CompactProductTile
                              product={product}
                              customerId={customerId}
                              wishlistItemId={wishlistByProductId[product.id] ?? null}
                              onWishlistChange={handleWishlistChange}
                              imagePriority={collection.id === smartCollections[0]?.id && ci < 2}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                  <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <h2 className="text-lg md:text-xl font-semibold">More for you</h2>
                      <p className="text-xs text-muted-foreground">
                        Showing products from your feed by department — {visibleProducts.length} of{' '}
                        {filteredProducts.length} in view
                      </p>
                    </div>
                    <div className="flex flex-col gap-8">
                      {moreForYouLayout.map((block, blockIndex) => {
                        if (block.kind === 'multi') {
                          const section = block.section;
                          return (
                            <div
                              key={section.title}
                              className="rounded-xl border border-border bg-background/60 p-3 sm:p-4 lg:w-full lg:basis-full"
                            >
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                                {section.title !== MORE_FOR_YOU_OTHER_LABEL ? (
                                  <Link
                                    href={`/category/products/${encodeURIComponent(section.title)}`}
                                    className="text-xs font-semibold text-primary hover:underline"
                                  >
                                    See all
                                  </Link>
                                ) : null}
                              </div>
                              <div className={moreForYouDepartmentGridClass(section.products.length)}>
                                {section.products.map((product, index) => (
                                  <div
                                    key={product.id}
                                    className={moreForYouProductCellClass(index, section.products.length)}
                                  >
                                    <CompactProductTile
                                      product={product}
                                      customerId={customerId}
                                      wishlistItemId={wishlistByProductId[product.id] ?? null}
                                      onWishlistChange={handleWishlistChange}
                                      imagePriority={blockIndex === 0 && index < 2}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`singleRow-${blockIndex}-${block.sections.map((s) => s.title).join('|')}`}
                            className="w-full flex flex-col gap-8 lg:flex-row lg:gap-6"
                          >
                            {block.sections.map((section, si) => (
                              <div
                                key={`${blockIndex}-${si}-${section.title}`}
                                className="rounded-xl border border-border bg-background/60 p-3 sm:p-4 lg:flex-1 lg:min-w-0"
                              >
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                  <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                                  {section.title !== MORE_FOR_YOU_OTHER_LABEL ? (
                                    <Link
                                      href={`/category/products/${encodeURIComponent(section.title)}`}
                                      className="text-xs font-semibold text-primary hover:underline"
                                    >
                                      See all
                                    </Link>
                                  ) : null}
                                </div>
                                <div className={moreForYouDepartmentGridClass(section.products.length)}>
                                  {section.products.map((product, index) => (
                                    <div
                                      key={product.id}
                                      className={moreForYouProductCellClass(index, section.products.length)}
                                    >
                                      <CompactProductTile
                                        product={product}
                                        customerId={customerId}
                                        wishlistItemId={wishlistByProductId[product.id] ?? null}
                                        onWishlistChange={handleWishlistChange}
                                        imagePriority={blockIndex === 0 && index < 2}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                    <div ref={sentinelRef} className="h-1 w-full" />
                  </section>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {visibleProducts.map((product, vi) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        customerId={customerId}
                        wishlistItemId={wishlistByProductId[product.id] ?? null}
                        onWishlistChange={handleWishlistChange}
                        imagePriority={vi < 4}
                      />
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

