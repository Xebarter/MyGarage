import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { Clock3, Search, Wrench, X } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import { cn } from '@/lib/utils';

export type SuggestionProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  category: string;
  brand: string;
  matchLabel?: string;
};

export type SuggestionCategory = {
  name: string;
  image: string;
  count: number;
  headline: string;
};

export type SuggestionService = {
  id: string;
  name: string;
  categoryId: string;
  categoryTitle: string;
};

export type SuggestionServiceCategory = {
  categoryId: string;
  categoryTitle: string;
  emoji: string;
  count: number;
  headline: string;
  topServiceName: string;
};

export type SearchSuggestionsPayload = {
  query: string;
  categories: SuggestionCategory[];
  products: SuggestionProduct[];
  serviceCategories?: SuggestionServiceCategory[];
  services?: SuggestionService[];
  matchedProductCount?: number;
  matchedServiceCount?: number;
};

export type SearchActionItem =
  | { kind: 'recent'; query: string }
  | { kind: 'search-all'; query: string }
  | { kind: 'category'; category: SuggestionCategory }
  | { kind: 'product'; product: SuggestionProduct }
  | { kind: 'service-category'; category: SuggestionServiceCategory }
  | { kind: 'service'; service: SuggestionService };

function formatPrice(price: number): string {
  return `UGX ${Math.round(Number(price) || 0).toLocaleString('en-UG')}`;
}

function highlightMatch(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q || q.length < 2) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) {
    // Try first token
    const token = needle.split(/\s+/).find((t) => t.length >= 2);
    if (!token) return text;
    const tIdx = lower.indexOf(token);
    if (tIdx < 0) return text;
    return (
      <>
        {text.slice(0, tIdx)}
        <mark className="rounded-sm bg-primary/15 px-0.5 font-semibold text-foreground">{text.slice(tIdx, tIdx + token.length)}</mark>
        {text.slice(tIdx + token.length)}
      </>
    );
  }
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/15 px-0.5 font-semibold text-foreground">{text.slice(idx, idx + needle.length)}</mark>
      {text.slice(idx + needle.length)}
    </>
  );
}

export function flattenSearchActions(
  suggestions: SearchSuggestionsPayload | null,
  query: string,
  recent: string[],
): SearchActionItem[] {
  const q = query.trim();
  const items: SearchActionItem[] = [];

  if (q.length < 2) {
    for (const recentQuery of recent.slice(0, 6)) {
      items.push({ kind: 'recent', query: recentQuery });
    }
    return items;
  }

  items.push({ kind: 'search-all', query: q });

  for (const category of suggestions?.categories ?? []) {
    items.push({ kind: 'category', category });
  }
  for (const product of suggestions?.products ?? []) {
    items.push({ kind: 'product', product });
  }
  for (const category of suggestions?.serviceCategories ?? []) {
    items.push({ kind: 'service-category', category });
  }
  for (const service of suggestions?.services ?? []) {
    items.push({ kind: 'service', service });
  }

  return items;
}

export function SearchSuggestionsPanel({
  query,
  suggestions,
  loading,
  error,
  recent,
  activeIndex,
  variant = 'desktop',
  onHoverIndex,
  onPickRecent,
  onClearRecent,
  onNavigate,
  className,
  style,
}: {
  query: string;
  suggestions: SearchSuggestionsPayload | null;
  loading: boolean;
  error: string | null;
  recent: string[];
  activeIndex: number;
  variant?: 'desktop' | 'mobile';
  onHoverIndex: (index: number) => void;
  onPickRecent: (query: string) => void;
  onClearRecent: () => void;
  onNavigate: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const q = query.trim();
  const hasResults =
    (suggestions?.categories?.length ?? 0) > 0 ||
    (suggestions?.products?.length ?? 0) > 0 ||
    (suggestions?.serviceCategories?.length ?? 0) > 0 ||
    (suggestions?.services?.length ?? 0) > 0;
  const showRecent = q.length < 2 && recent.length > 0;
  const matchedProducts = suggestions?.matchedProductCount ?? suggestions?.products?.length ?? 0;

  let cursor = -1;
  const nextIndex = () => {
    cursor += 1;
    return cursor;
  };

  const isActive = (index: number) => index === activeIndex;

  return (
    <div
      className={cn(
        'overflow-hidden border border-border bg-popover shadow-xl',
        variant === 'desktop'
          ? 'absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl'
          : 'fixed inset-x-0 z-[60] rounded-b-2xl border-x-0 border-t-0 backdrop-blur-md',
        className,
      )}
      style={style}
      role="listbox"
      aria-label="Search suggestions"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div
        className={cn(
          'overflow-y-auto overflow-x-hidden',
          variant === 'desktop'
            ? 'max-h-[min(70vh,32rem)] p-2'
            : 'min-h-0 flex-1 overscroll-y-contain px-2 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]',
        )}
      >
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl px-2 py-2">
                <div className="h-11 w-11 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-2.5 w-1/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">{error}</p>
        ) : showRecent ? (
          <div className="p-1">
            <div className="mb-1.5 flex items-center justify-between px-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent searches
              </p>
              <button
                type="button"
                onClick={onClearRecent}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {recent.slice(0, 6).map((recentQuery) => {
                const index = nextIndex();
                return (
                  <button
                    key={recentQuery}
                    type="button"
                    role="option"
                    aria-selected={isActive(index)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition',
                      isActive(index) ? 'bg-accent' : 'hover:bg-accent/70',
                    )}
                    onMouseEnter={() => onHoverIndex(index)}
                    onClick={() => onPickRecent(recentQuery)}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Clock3 className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {recentQuery}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : q.length >= 2 && !hasResults ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm font-medium text-foreground">No matches for “{q}”</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a part name, brand, category, or service.
            </p>
          </div>
        ) : hasResults || q.length >= 2 ? (
          <div className="space-y-3 p-1">
            {q.length >= 2 ? (() => {
              const index = nextIndex();
              return (
              <button
                type="button"
                role="option"
                aria-selected={isActive(index)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition',
                  isActive(index) ? 'bg-primary/10' : 'hover:bg-accent/70',
                )}
                onMouseEnter={() => onHoverIndex(index)}
                onClick={() => {
                  onPickRecent(q);
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Search className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    Search for “{q}”
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {matchedProducts > 0
                      ? `${matchedProducts} product${matchedProducts === 1 ? '' : 's'} matched`
                      : 'Browse all results'}
                  </span>
                </span>
              </button>
              );
            })() : null}

            {(suggestions?.categories?.length ?? 0) > 0 ? (
              <section>
                <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Categories
                </p>
                <div className="flex flex-col gap-0.5">
                  {(suggestions?.categories ?? []).map((c) => {
                    const index = nextIndex();
                    return (
                      <Link
                        key={c.name}
                        href={`/category/products/${encodeURIComponent(c.name)}`}
                        role="option"
                        aria-selected={isActive(index)}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition',
                          isActive(index) ? 'bg-primary/10' : 'hover:bg-accent/70',
                        )}
                        onMouseEnter={() => onHoverIndex(index)}
                        onClick={onNavigate}
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#F3F5F8] ring-1 ring-black/[0.06]">
                          <ProductImage
                            src={c.image?.trim() ? c.image : '/products/default.jpg'}
                            alt=""
                            width={44}
                            height={44}
                            className="h-full w-full object-contain p-1.5"
                            sizes="44px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                            {highlightMatch(c.headline, q)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {c.count} item{c.count === 1 ? '' : 's'} · View category
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {(suggestions?.products?.length ?? 0) > 0 ? (
              <section>
                <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Products
                </p>
                <div className="flex flex-col gap-0.5">
                  {(suggestions?.products ?? []).map((p) => {
                    const index = nextIndex();
                    return (
                      <Link
                        key={p.id}
                        href={`/products/${p.id}`}
                        role="option"
                        aria-selected={isActive(index)}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition',
                          isActive(index) ? 'bg-accent' : 'hover:bg-accent/70',
                        )}
                        onMouseEnter={() => onHoverIndex(index)}
                        onClick={onNavigate}
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#F3F5F8] ring-1 ring-black/[0.06]">
                          <ProductImage
                            src={p.image || '/products/default.jpg'}
                            alt=""
                            width={44}
                            height={44}
                            className="h-full w-full object-contain p-1.5"
                            sizes="44px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                            {highlightMatch(p.name, q)}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {p.matchLabel || p.brand || p.category}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold tabular-nums text-foreground">
                            {formatPrice(p.price)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {(suggestions?.serviceCategories?.length ?? 0) > 0 ? (
              <section>
                <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Service categories
                </p>
                <div className="flex flex-col gap-0.5">
                  {(suggestions?.serviceCategories ?? []).map((sc) => {
                    const index = nextIndex();
                    return (
                      <Link
                        key={sc.categoryId}
                        href={`/buyer/services?sc=${encodeURIComponent(sc.categoryId)}&quick=1`}
                        role="option"
                        aria-selected={isActive(index)}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition',
                          isActive(index) ? 'bg-amber-500/10' : 'hover:bg-accent/70',
                        )}
                        onMouseEnter={() => onHoverIndex(index)}
                        onClick={onNavigate}
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-xl ring-1 ring-black/[0.06]"
                          aria-hidden
                        >
                          {sc.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                            {highlightMatch(sc.headline, q)}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {sc.topServiceName}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {(suggestions?.services?.length ?? 0) > 0 ? (
              <section>
                <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Services
                </p>
                <div className="flex flex-col gap-0.5">
                  {(suggestions?.services ?? []).map((s) => {
                    const index = nextIndex();
                    return (
                      <Link
                        key={s.id}
                        href={`/buyer/services?sc=${encodeURIComponent(s.categoryId)}&ss=${encodeURIComponent(s.name)}&quick=1`}
                        role="option"
                        aria-selected={isActive(index)}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition',
                          isActive(index) ? 'bg-accent' : 'hover:bg-accent/70',
                        )}
                        onMouseEnter={() => onHoverIndex(index)}
                        onClick={onNavigate}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Wrench className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                            {highlightMatch(s.name, q)}
                          </p>
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">{s.categoryTitle}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search parts and services.
          </p>
        )}
      </div>
    </div>
  );
}

export function SearchClearButton({
  visible,
  onClear,
}: {
  visible: boolean;
  onClear: () => void;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="Clear search"
      className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClear}
    >
      <X className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
