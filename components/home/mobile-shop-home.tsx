'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Menu, SearchX } from 'lucide-react';

import { AddItemsSidebar } from '@/components/additems-sidebar';
import { MobileShopProductCard } from '@/components/home/mobile-shop-product-card';
import { SearchServicesResults } from '@/components/search/search-services-results';
import { addProductToCart, quantityOfProduct, readCartItems, setProductCartQuantity } from '@/lib/cart-client';
import type { Product } from '@/lib/db';
import type { MatchedCatalogService } from '@/lib/search/match-catalog-services';
import { cn } from '@/lib/utils';

function resultLabel(productCount: number, serviceCount: number, query: string, category: string): string {
  const parts: string[] = [];
  if (productCount > 0) parts.push(productCount === 1 ? '1 part' : `${productCount} parts`);
  if (serviceCount > 0) parts.push(serviceCount === 1 ? '1 service' : `${serviceCount} services`);
  const n = parts.length > 0 ? parts.join(' · ') : 'No matches';
  const q = query.trim();
  if (q && category !== 'all') return `${n} for “${q}” in ${category}`;
  if (q) return `${n} for “${q}”`;
  if (category !== 'all') return `${n} in ${category}`;
  return n;
}

export function MobileShopHome({
  products,
  visibleProducts,
  matchedServices = [],
  categories,
  selectedCategory,
  searchQuery,
  loading,
  infiniteLoading,
  sentinelRef,
  onSelectCategory,
  onReset,
}: {
  products: Product[];
  visibleProducts: Product[];
  matchedServices?: MatchedCatalogService[];
  categories: string[];
  selectedCategory: string;
  searchQuery: string;
  loading: boolean;
  infiniteLoading: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onSelectCategory: (category: string) => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}) {
  const [qtyByProductId, setQtyByProductId] = useState<Record<string, number>>({});
  const [browseOpen, setBrowseOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const snackTimerRef = useRef<number | null>(null);

  const hasFilters = searchQuery.trim().length > 0 || selectedCategory !== 'all';
  const hasHits = visibleProducts.length > 0 || matchedServices.length > 0;

  const refreshCart = useCallback(() => {
    const items = readCartItems();
    const map: Record<string, number> = {};
    for (const item of items) {
      const qty = Math.max(0, Number(item.quantity) || 0);
      map[item.id] = (map[item.id] ?? 0) + qty;
    }
    setQtyByProductId(map);
  }, []);

  useEffect(() => {
    refreshCart();
    window.addEventListener('cart:updated', refreshCart);
    window.addEventListener('storage', refreshCart);
    return () => {
      window.removeEventListener('cart:updated', refreshCart);
      window.removeEventListener('storage', refreshCart);
    };
  }, [refreshCart]);

  useEffect(() => {
    return () => {
      if (snackTimerRef.current) window.clearTimeout(snackTimerRef.current);
    };
  }, []);

  const showSnack = useCallback((name: string) => {
    setSnack(name);
    if (snackTimerRef.current) window.clearTimeout(snackTimerRef.current);
    snackTimerRef.current = window.setTimeout(() => setSnack(null), 1600);
  }, []);

  const handleAdd = (product: Product) => {
    const wasEmpty = quantityOfProduct(readCartItems(), product.id) === 0;
    addProductToCart(product);
    if (wasEmpty) showSnack(product.name);
  };

  const handleRemove = (product: Product) => {
    const next = Math.max(0, (qtyByProductId[product.id] ?? 0) - 1);
    setProductCartQuantity(product.id, next);
  };

  return (
    <div className="overflow-x-hidden bg-[#F2F4F8] md:hidden">
      {browseOpen ? (
        <div
          className="fixed inset-x-0 top-14 bottom-0 z-[45] bg-black/20 backdrop-blur-sm"
          onClick={() => setBrowseOpen(false)}
        />
      ) : null}
      <AddItemsSidebar
        open={browseOpen}
        pinned={browseOpen}
        onRequestClose={() => setBrowseOpen(false)}
      />

      {!loading ? (
        <>
          <div className="flex items-center gap-2 pl-3 pr-0 pt-2.5">
            <button
              type="button"
              aria-label="Browse categories"
              onClick={() => setBrowseOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-white"
            >
              <Menu className="h-[22px] w-[22px] text-[#0B1220]" aria-hidden />
            </button>
            <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max items-center gap-2 py-0.5 pr-4">
                <Chip
                  label="All"
                  selected={selectedCategory === 'all'}
                  onClick={() => onSelectCategory('all')}
                />
                {categories.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    selected={selectedCategory === name}
                    onClick={() => onSelectCategory(selectedCategory === name ? 'all' : name)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-1">
            <p className="text-[13px] font-medium text-[#8B9BB0]">
              {resultLabel(products.length, matchedServices.length, searchQuery, selectedCategory)}
            </p>
            {hasFilters ? (
              <button type="button" onClick={onReset} className="text-[13px] font-semibold text-primary">
                Reset
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      <main className="px-3 pb-6">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !hasHits ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
              <SearchX className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-4 text-[17px] font-bold text-[#0B1220]">
              {hasFilters ? 'No matches' : 'No products yet'}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#8B9BB0]">
              {hasFilters
                ? 'Try a different keyword or clear filters.'
                : 'Check back soon for parts and accessories.'}
            </p>
            {hasFilters ? (
              <button type="button" onClick={onReset} className="mt-4 text-sm font-semibold text-primary">
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {matchedServices.length > 0 ? (
              <SearchServicesResults services={matchedServices} compact className="mb-5" />
            ) : null}
            {visibleProducts.length > 0 ? (
              <>
                {matchedServices.length > 0 ? (
                  <p className="mb-2.5 px-1 text-[13px] font-semibold text-[#8B9BB0]">Parts</p>
                ) : null}
                <div className="grid grid-cols-2 gap-2.5">
                  {visibleProducts.map((product, index) => (
                    <MobileShopProductCard
                      key={product.id}
                      product={product}
                      quantity={qtyByProductId[product.id] ?? 0}
                      onAdd={() => handleAdd(product)}
                      onRemove={() => handleRemove(product)}
                      imagePriority={index < 4}
                      toneIndex={index}
                    />
                  ))}
                </div>
                <div ref={sentinelRef} className="h-1 w-full" />
                {infiniteLoading ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Loading more products…</p>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </main>

      {snack ? (
        <div className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 flex items-center justify-between gap-3 rounded-xl bg-[#0B1220] px-4 py-3 text-sm text-white shadow-lg">
          <p className="min-w-0 flex-1 truncate">{snack} added to cart</p>
          <Link href="/cart" className="shrink-0 font-semibold text-[#93C5FD]">
            View
          </Link>
        </div>
      ) : null}

    </div>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition',
        selected
          ? 'border-primary bg-primary font-bold text-white'
          : 'border-border bg-white font-medium text-[#475569]',
      )}
    >
      {label}
    </button>
  );
}
