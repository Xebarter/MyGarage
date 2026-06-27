'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProductCard } from '@/components/product-card';
import { ProductWishlistButton } from '@/components/product-wishlist-button';
import type { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { serviceIntentKeywordsByCategoryId, userServiceCategories } from '@/lib/services-catalog';
import type { UserServiceCategory } from '@/lib/services-catalog';
import { Wrench, ShieldCheck, ArrowRight, LayoutGrid, X, ChevronLeft, ChevronRight, CreditCard, Truck, Headphones, Star, ShoppingBag } from 'lucide-react';
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
  { icon: ShieldCheck, label: 'Secure checkout' },
  { icon: CreditCard, label: 'Verified vendors' },
  { icon: Truck, label: 'Fast delivery' },
  { icon: Headphones, label: 'Easy returns' },
] as const;

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        ) : null}
        <h2 className={cn('font-bold tracking-tight text-foreground', eyebrow ? 'mt-1.5 text-xl sm:text-2xl' : 'text-xl sm:text-2xl')}>
          {title}
        </h2>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function ScrollControls({ onLeft, onRight, label }: { onLeft: () => void; onRight: () => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onLeft}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-primary/30 hover:bg-muted"
        aria-label={`Scroll ${label} left`}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onRight}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-primary/30 hover:bg-muted"
        aria-label={`Scroll ${label} right`}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ProductRowSection({
  sectionId,
  eyebrow,
  title,
  description,
  products,
  customerId,
  wishlistByProductId,
  onWishlistChange,
  onScroll,
  registerRowRef,
  imagePriorityCount = 0,
  headerAction,
}: {
  sectionId: string;
  eyebrow?: string;
  title: string;
  description?: string;
  products: Product[];
  customerId: string | null;
  wishlistByProductId: Record<string, string>;
  onWishlistChange: (next: { productId: string; wishlistItemId: string | null }) => void;
  onScroll: (key: string, direction: 'left' | 'right') => void;
  registerRowRef: (id: string, node: HTMLDivElement | null) => void;
  imagePriorityCount?: number;
  headerAction?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} />
        <div className="flex items-center gap-3">
          {headerAction}
          <ScrollControls
            label={title}
            onLeft={() => onScroll(sectionId, 'left')}
            onRight={() => onScroll(sectionId, 'right')}
          />
        </div>
      </div>
      <div
        ref={(node) => registerRowRef(sectionId, node)}
        className="flex flex-nowrap gap-4 overflow-x-auto px-5 py-5 sm:px-6 [scrollbar-width:thin]"
      >
        {products.map((product, index) => (
          <div key={product.id} className="w-[72vw] flex-none sm:w-[220px] md:w-[240px]">
            <CompactProductTile
              product={product}
              customerId={customerId}
              wishlistItemId={wishlistByProductId[product.id] ?? null}
              onWishlistChange={onWishlistChange}
              imagePriority={index < imagePriorityCount}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryQuickLink({ category, productCount }: { category: string; productCount?: number }) {
  return (
    <Link
      href={`/?category=${encodeURIComponent(category)}`}
      className="group flex min-w-[9rem] flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md sm:min-w-[10.5rem]"
    >
      <span className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
        {formatCategoryLabel(category)}
      </span>
      {productCount ? (
        <span className="mt-3 text-xs text-muted-foreground">{productCount} items</span>
      ) : (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          Shop now
          <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      )}
    </Link>
  );
}

function ServiceCategoryCard({ category }: { category: UserServiceCategory }) {
  return (
    <Link
      href={`/buyer/services?sc=${encodeURIComponent(category.id)}&quick=1`}
      className="group flex h-full flex-col rounded-xl border border-border/70 bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
    >
      <span className="text-2xl" aria-hidden>
        {category.emoji}
      </span>
      <h3 className="mt-3 text-base font-semibold leading-snug text-foreground group-hover:text-primary">
        {category.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{category.useWhen}</p>
      <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">
        {category.services.slice(0, 2).join(' · ')}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        Book now
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

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
    <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <ProductWishlistButton
        product={product}
        customerId={customerId}
        savedWishlistItemId={wishlistItemId}
        onUpdate={onWishlistChange}
        className="absolute right-2.5 top-2.5 z-10 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100"
      />
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
          <ProductImage
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
            priority={imagePriority}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{product.category}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{product.name}</p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <p className="text-base font-bold tabular-nums text-foreground">{formatProductPriceLabel(product)}</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View
              <ArrowRight className="h-3 w-3" aria-hidden />
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

  const popularCategories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const c = p.category?.trim();
      if (!c) return;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return chipCategories
      .filter((c) => c !== 'all')
      .slice(0, 8)
      .map((name) => ({ name, count: counts.get(name) ?? 0 }));
  }, [chipCategories, products]);

  const featuredProducts = useMemo(() => visibleProducts.slice(0, 8), [visibleProducts]);
  const featuredServices = useMemo(
    () => feedOrderedServiceCategories.slice(0, 6),
    [feedOrderedServiceCategories],
  );

  const registerRowRef = useCallback((id: string, node: HTMLDivElement | null) => {
    rowRefs.current[id] = node;
  }, []);

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
        {/* Hero */}
        <section className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-background">
          <div className="mx-auto w-full max-w-none px-2 py-5 sm:px-2.5 md:px-3 md:py-7">
            {!activeBannerProduct ? (
              <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-card to-primary/[0.04] shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />
                <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary/5 blur-3xl" aria-hidden />
                <div className="relative grid gap-8 p-6 sm:p-8 md:grid-cols-2 md:items-center md:p-10 lg:p-12">
                  <div>
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                      <Star className="h-3.5 w-3.5" aria-hidden />
                      Uganda&apos;s automotive marketplace
                    </p>
                    <h1 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                      Quality parts. Trusted service. Delivered reliably.
                    </h1>
                    <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                      Browse fitment-focused parts from verified vendors, book workshop services, and checkout securely — all in one place.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                      >
                        <ShoppingBag className="h-4 w-4" aria-hidden />
                        Shop products
                      </Link>
                      <Link
                        href="/services"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
                      >
                        Book a service
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {TRUST_BADGES.map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/80 p-4 backdrop-blur-sm"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="text-sm font-medium text-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                {/* Frame matches 1600×450 promo assets (32∶9) */}
                <div className="relative aspect-[1600/450] w-full overflow-hidden bg-muted/30">
                  <ProductImage
                    src={activeBannerItem?.bannerUrl || activeBannerProduct.image}
                    alt={activeBannerProduct.name}
                    fill
                    className={cn(
                      'object-cover transition-opacity duration-500 ease-in-out',
                      bannerFading ? 'opacity-0' : 'opacity-100',
                    )}
                    sizes="100vw"
                    priority={activeBannerIndex === 0}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-black/5" />
                </div>

                <div className="flex flex-col gap-4 border-t border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 md:p-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Featured
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Fast delivery
                      </span>
                    </div>
                    <h1 className="mt-2 line-clamp-1 text-lg font-bold tracking-tight text-foreground sm:text-xl md:text-2xl">
                      {activeBannerProduct.name}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="text-lg font-bold tabular-nums text-foreground sm:text-xl">
                        {formatProductPriceLabel(activeBannerProduct)}
                      </span>
                      <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                        {activeBannerProduct.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
                    <Link
                      href={`/products/${activeBannerProduct.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:flex-none"
                    >
                      Shop now
                    </Link>
                    <Link
                      href={`/products/${activeBannerProduct.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent sm:flex-none"
                    >
                      View details
                    </Link>
                    <ProductWishlistButton
                      product={activeBannerProduct}
                      customerId={customerId}
                      savedWishlistItemId={wishlistByProductId[activeBannerProduct.id] ?? null}
                      onUpdate={handleWishlistChange}
                      className="h-10 w-10 shrink-0 border border-border bg-background"
                    />
                  </div>
                </div>

                {bannerItems.length > 1 ? (
                  <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
                    <p className="text-xs text-muted-foreground">
                      Promotion {activeBannerIndex + 1} of {bannerItems.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {bannerItems.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveBannerIndex(index)}
                          aria-label={`Show promotion ${index + 1}`}
                          className={cn(
                            'h-1.5 rounded-full transition-all',
                            index === activeBannerIndex
                              ? 'w-8 bg-primary'
                              : 'w-4 bg-muted-foreground/30 hover:bg-muted-foreground/50',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        {/* Category navigation */}
        <section className="sticky top-0 z-20 border-b border-border/70 bg-background/95 py-3.5 shadow-sm backdrop-blur-md md:py-4">
          <div className="mx-auto w-full max-w-none px-2 sm:px-2.5 md:px-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" aria-hidden />
                <p className="text-sm font-semibold text-foreground">Browse categories</p>
                {categoryCatalog.length > 0 ? (
                  <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline">
                    {categoryCatalog.length}
                  </span>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-background/95 to-transparent sm:w-8"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-background/95 to-transparent sm:w-8"
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
                        className={cn(
                          'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all',
                          selectedCategory === category
                            ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20'
                            : 'border border-border/80 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                        )}
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

        {/* Trust strip */}
        <section className="border-b border-border/60 bg-muted/20">
          <div className="mx-auto w-full max-w-none px-2 py-3.5 sm:px-2.5 md:px-3">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 sm:justify-start">
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Product discovery */}
        <section className="mx-auto w-full max-w-none px-2 py-8 sm:px-2.5 md:px-3 md:py-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
              <p className="mt-4 text-sm font-medium text-foreground">Loading your personalized feed…</p>
              <p className="mt-1 text-xs text-muted-foreground">Curating products and recommendations</p>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
              <p className="mt-4 text-lg font-semibold text-foreground">
                {selectedCategory === 'all' && !searchQuery.trim()
                  ? 'No products in your feed yet'
                  : 'No matching products found'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedCategory === 'all' && !searchQuery.trim()
                  ? 'Check back soon — new inventory is added regularly.'
                  : 'Try a different category or adjust your search.'}
              </p>
              {selectedCategory !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Browse all products
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-14 md:space-y-16">
              {isDefaultHomeFeed ? (
                <>
                  {/* —— Products —— */}
                  <div className="space-y-10 md:space-y-12">
                    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                      <div className="border-b border-border/60 bg-gradient-to-r from-primary/[0.05] to-transparent px-5 py-5 sm:px-6">
                        <SectionHeader
                          eyebrow="Shop"
                          title="Recommended for you"
                          description="Personalized picks from verified vendors — add to cart or save for later."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6 lg:grid-cols-4">
                        {featuredProducts.slice(0, 8).map((product, index) => (
                          <CompactProductTile
                            key={`featured-${product.id}`}
                            product={product}
                            customerId={customerId}
                            wishlistItemId={wishlistByProductId[product.id] ?? null}
                            onWishlistChange={handleWishlistChange}
                            imagePriority={index < 4}
                          />
                        ))}
                      </div>
                    </section>

                    {popularCategories.length > 0 ? (
                      <section>
                        <SectionHeader
                          eyebrow="Categories"
                          title="Shop by category"
                          description="Jump straight into the departments most relevant to your feed."
                          className="mb-5 px-1"
                        />
                        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
                          {popularCategories.map(({ name, count }) => (
                            <CategoryQuickLink key={name} category={name} productCount={count} />
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                      <div className="border-b border-border/60 bg-gradient-to-r from-primary/[0.06] to-transparent px-5 py-5 sm:px-6">
                        <SectionHeader
                          eyebrow="Best value"
                          title="Deals on essentials"
                          description="Quality parts at competitive prices from your feed."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:gap-4 sm:p-6">
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
                  </div>

                  {/* —— Services —— */}
                  <section className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-muted/40 via-card to-card shadow-sm">
                    <div className="border-b border-border/60 px-5 py-5 sm:px-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-primary">
                            <Wrench className="h-4 w-4" aria-hidden />
                            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Services</p>
                          </div>
                          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                            Book workshop & roadside services
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                            Install the parts you buy, fix issues fast, or schedule routine maintenance — matched to what you&apos;re shopping for.
                          </p>
                        </div>
                        <Link
                          href="/buyer/services"
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                          View all services
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6 lg:grid-cols-3">
                      {featuredServices.map((serviceCategory) => (
                        <ServiceCategoryCard key={serviceCategory.id} category={serviceCategory} />
                      ))}
                    </div>
                  </section>

                  {/* —— Discover more products —— */}
                  <div className="space-y-10 md:space-y-12">
                    <SectionHeader
                      eyebrow="Discover"
                      title="Collections picked for you"
                      description="Curated product rows based on your browsing and shopping patterns."
                      className="px-1"
                    />

                    {smartCollections.map((collection, collectionIndex) => (
                      <ProductRowSection
                        key={collection.id}
                        sectionId={collection.id}
                        eyebrow="Collection"
                        title={`${collection.serviceEmoji} ${collection.title}`}
                        description={collection.subtitle}
                        products={collection.products}
                        customerId={customerId}
                        wishlistByProductId={wishlistByProductId}
                        onWishlistChange={handleWishlistChange}
                        onScroll={scrollRow}
                        registerRowRef={registerRowRef}
                        imagePriorityCount={collectionIndex === 0 ? 2 : 0}
                        headerAction={
                          <Link
                            href={
                              collection.id === 'recommended-products'
                                ? '/buyer/services'
                                : `/buyer/services?sc=${encodeURIComponent(collection.id)}&quick=1`
                            }
                            className="hidden items-center gap-1 text-xs font-semibold text-primary hover:underline sm:inline-flex"
                          >
                            Book service
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </Link>
                        }
                      />
                    ))}

                    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                      <div className="border-b border-border/60 px-5 py-5 sm:px-6">
                        <SectionHeader
                          eyebrow="Departments"
                          title="Browse by department"
                          description={`${visibleProducts.length} of ${filteredProducts.length} products in your feed.`}
                        />
                      </div>
                      <div className="flex flex-col gap-6 p-4 sm:gap-8 sm:p-6">
                      {moreForYouLayout.map((block, blockIndex) => {
                        if (block.kind === 'multi') {
                          const section = block.section;
                          return (
                            <div
                              key={section.title}
                              className="rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-5"
                            >
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-base font-semibold tracking-tight text-foreground">{section.title}</h3>
                                {section.title !== MORE_FOR_YOU_OTHER_LABEL ? (
                                  <Link
                                    href={`/category/products/${encodeURIComponent(section.title)}`}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                  >
                                    See all
                                    <ArrowRight className="h-3 w-3" aria-hidden />
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
                                className="rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-5 lg:min-w-0 lg:flex-1"
                              >
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                  <h3 className="text-base font-semibold tracking-tight text-foreground">{section.title}</h3>
                                  {section.title !== MORE_FOR_YOU_OTHER_LABEL ? (
                                    <Link
                                      href={`/category/products/${encodeURIComponent(section.title)}`}
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                    >
                                      See all
                                      <ArrowRight className="h-3 w-3" aria-hidden />
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
                    {infiniteLoading ? (
                      <p className="pb-4 text-center text-xs text-muted-foreground">Loading more products…</p>
                    ) : null}
                    </section>
                  </div>
                </>
              ) : (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
                    <SectionHeader
                      eyebrow="Shop"
                      title={selectedCategory !== 'all' ? formatCategoryLabel(selectedCategory) : 'Matching products'}
                      description={`${displayedProducts.length} result${displayedProducts.length !== 1 ? 's' : ''} in this view`}
                      className="mb-6"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  </div>
                  <div ref={sentinelRef} className="h-1 w-full" />
                  {infiniteLoading ? (
                    <p className="text-center text-xs text-muted-foreground">Loading more products…</p>
                  ) : null}

                  <section className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-primary/[0.06] to-transparent p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Wrench className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">Need installation or repair?</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Book a trusted service to go with the parts you&apos;re browsing.
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

