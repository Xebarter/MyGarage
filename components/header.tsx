'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Menu, Search, UserCircle2, ChevronDown, Siren, Wrench } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AddItemsSidebar } from '@/components/additems-sidebar';

type SuggestionProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  category: string;
  brand: string;
};

type SuggestionCategory = {
  name: string;
  image: string;
  count: number;
  headline: string;
};

type SuggestionService = {
  id: string;
  name: string;
  categoryId: string;
  categoryTitle: string;
};

type SuggestionServiceCategory = {
  categoryId: string;
  categoryTitle: string;
  emoji: string;
  count: number;
  headline: string;
  topServiceName: string;
};

export function Header() {
  const router = useRouter();
  const [pinned, setPinned] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [profileMenuMode, setProfileMenuMode] = useState<'login' | 'join'>('login')
  const [cartCount, setCartCount] = useState(0)
  const pinnedRef = useRef(pinned)
  const hoverCloseTimerRef = useRef<number | null>(null)
  const profileCloseTimerRef = useRef<number | null>(null)
  const mobileProfileMenuRef = useRef<HTMLDivElement | null>(null)
  const desktopProfileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    pinnedRef.current = pinned
  }, [pinned])

  const refreshCartCount = useCallback(() => {
    try {
      const raw = localStorage.getItem('cartItems') || '[]'
      const items = JSON.parse(raw) as Array<{ quantity?: number }>
      const next = Array.isArray(items)
        ? items.reduce((sum, item) => sum + Math.max(0, Number(item?.quantity ?? 0) || 0), 0)
        : 0
      setCartCount(next)
    } catch {
      setCartCount(0)
    }
  }, [])

  useEffect(() => {
    refreshCartCount()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cartItems') refreshCartCount()
    }
    const onFocus = () => refreshCartCount()
    const onCartUpdated = () => refreshCartCount()

    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    window.addEventListener('cart:updated', onCartUpdated as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('cart:updated', onCartUpdated as EventListener)
    }
  }, [refreshCartCount])

  const [urlQ, setUrlQ] = useState(() => {
    if (typeof window === 'undefined') return '';
    return (new URLSearchParams(window.location.search).get('q') ?? '').toString().trim();
  });
  const [searchValue, setSearchValue] = useState(urlQ);

  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    query: string;
    categories: SuggestionCategory[];
    products: SuggestionProduct[];
    serviceCategories?: SuggestionServiceCategory[];
    services?: SuggestionService[];
  } | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const suggestionsBlurCloseTimerRef = useRef<number | null>(null);
  const mobileSearchFieldRef = useRef<HTMLDivElement | null>(null);
  const [mobileSuggestLayout, setMobileSuggestLayout] = useState<{ top: number; maxHeight: number } | null>(null);

  useEffect(() => {
    // Keep the search input in sync when the URL changes (e.g. back/forward).
    setSearchValue(urlQ);
  }, [urlQ]);

  useEffect(() => {
    function syncFromLocation() {
      setUrlQ((new URLSearchParams(window.location.search).get('q') ?? '').toString().trim());
    }
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  const closeSidebar = useCallback(() => {
    setPinned(false)
    setHoverOpen(false)
  }, [])

  const applySearch = useCallback(
    (raw: string, opts?: { closeSidebar?: boolean }) => {
      const next = raw.trim();
      if (next.length > 0) {
        router.replace(`/?q=${encodeURIComponent(next)}`);
        setUrlQ(next);
      } else {
        router.replace('/');
        setUrlQ('');
      }
      if (opts?.closeSidebar) closeSidebar();
    },
    [router, closeSidebar],
  );

  // Amazon-like search: debounce updates while typing.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (searchValue.trim() === urlQ) return;
      applySearch(searchValue);
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchValue, urlQ, applySearch]);

  // Live suggestions (categories + top matching products) under the search bar.
  useEffect(() => {
    if (!suggestionsVisible) return;

    const q = searchValue.trim();
    if (q.length < 2) {
      setSuggestions(null);
      setSuggestionsError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        setSuggestionsError(null);

        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to fetch suggestions');
        }
        if (cancelled) return;
        setSuggestions(data);
      } catch (e) {
        if (cancelled) return;
        if ((e as Error)?.name === 'AbortError') return;
        setSuggestions(null);
        setSuggestionsError('No suggestions');
      } finally {
        if (cancelled) return;
        setSuggestionsLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      controller.abort();
    };
  }, [searchValue, suggestionsVisible]);

  useLayoutEffect(() => {
    if (!suggestionsVisible || searchValue.trim().length < 2) {
      setMobileSuggestLayout(null);
      return;
    }

    const run = () => {
      if (typeof window === 'undefined') return;
      const mq = window.matchMedia('(max-width: 767px)');
      if (!mq.matches) {
        setMobileSuggestLayout(null);
        return;
      }
      const el = mobileSearchFieldRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const top = Math.ceil(r.bottom + 6);
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const maxHeight = Math.max(180, viewportH - top - 12);
      setMobileSuggestLayout({ top, maxHeight });
    };

    run();
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    window.addEventListener('resize', run);
    window.addEventListener('scroll', run, true);
    vv?.addEventListener('resize', run);
    vv?.addEventListener('scroll', run);
    return () => {
      window.removeEventListener('resize', run);
      window.removeEventListener('scroll', run, true);
      vv?.removeEventListener('resize', run);
      vv?.removeEventListener('scroll', run);
    };
  }, [suggestionsVisible, searchValue]);

  const closeSuggestions = useCallback(() => {
    setSuggestionsVisible(false);
  }, []);

  const showSuggestionsNow = useCallback(() => {
    if (suggestionsBlurCloseTimerRef.current) window.clearTimeout(suggestionsBlurCloseTimerRef.current);
    setSuggestionsVisible(true);
  }, []);

  const buildCategoryHref = useCallback((category?: string) => {
    const cat = (category ?? '').trim();
    if (!cat || cat === 'all') return '/';
    return `/category/products/${encodeURIComponent(cat)}`;
  }, []);

  const buildServiceHref = useCallback((categoryId: string, serviceName: string) => {
    return `/buyer/services?sc=${encodeURIComponent(categoryId)}&ss=${encodeURIComponent(serviceName)}&quick=1`;
  }, []);

  const buildServiceCategoryHref = useCallback((categoryId: string) => {
    return `/buyer/services?sc=${encodeURIComponent(categoryId)}&quick=1`;
  }, []);

  const open = pinned || hoverOpen

  const scheduleHoverClose = useCallback(() => {
    if (pinnedRef.current) return
    if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current)
    hoverCloseTimerRef.current = window.setTimeout(() => {
      if (!pinnedRef.current) setHoverOpen(false)
    }, 150)
  }, [])

  const handleHoverOpen = useCallback(() => {
    if (pinnedRef.current) return
    if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current)
    setHoverOpen(true)
  }, [])

  const togglePinned = useCallback(() => {
    setPinned((prev) => {
      const next = !prev
      if (next) setHoverOpen(true)
      else setHoverOpen(false)
      return next
    })
  }, [])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSidebar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, closeSidebar])

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node
      const inMobile = mobileProfileMenuRef.current?.contains(t) ?? false
      const inDesktop = desktopProfileMenuRef.current?.contains(t) ?? false
      if (!inMobile && !inDesktop) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const handleProfileHoverOpen = useCallback(() => {
    if (profileCloseTimerRef.current) window.clearTimeout(profileCloseTimerRef.current)
    setProfileMenuOpen(true)
  }, [])

  const scheduleProfileHoverClose = useCallback(() => {
    if (profileCloseTimerRef.current) window.clearTimeout(profileCloseTimerRef.current)
    profileCloseTimerRef.current = window.setTimeout(() => {
      setProfileMenuOpen(false)
      setProfileMenuMode('login')
    }, 150)
  }, [])

  const toggleProfileMenu = useCallback(() => {
    setProfileMenuOpen((prev) => !prev)
  }, [])

  return (
    <>
    <header className="border-b border-border bg-background md:sticky md:top-0 md:z-40">
      {open ? (
        <div
          className="fixed inset-x-0 top-12 md:top-16 bottom-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      ) : null}
      <AddItemsSidebar
        open={open}
        pinned={pinned}
        onRequestClose={closeSidebar}
        onMouseEnter={handleHoverOpen}
        onMouseLeave={scheduleHoverClose}
      />
      <div className="md:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Open categories"
                aria-expanded={open}
                onMouseEnter={handleHoverOpen}
                onMouseLeave={scheduleHoverClose}
                onClick={togglePinned}
                className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground transition"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/icon0.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 object-contain"
                />
                <span className="text-lg font-bold text-foreground">MyGarage</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/cart"
                aria-label="Open cart"
                className="relative inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-foreground hover:bg-accent hover:text-accent-foreground transition"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-red-700 bg-red-600 px-1 text-[11px] font-semibold text-white shadow-sm">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                ) : null}
              </Link>
              <div
                ref={mobileProfileMenuRef}
                className="relative"
                onMouseEnter={handleProfileHoverOpen}
                onMouseLeave={scheduleProfileHoverClose}
              >
                <button
                  type="button"
                  aria-label="Open profile menu"
                  aria-expanded={profileMenuOpen}
                  onClick={toggleProfileMenu}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition"
                >
                  <UserCircle2 className="h-5 w-5" />
                  <ChevronDown className="h-4 w-4" />
                </button>
                {profileMenuOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg z-50">
                    {profileMenuMode === 'login' ? (
                      <>
                        <Link
                          href="/auth?role=buyer&next=/buyer"
                          className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                        >
                          Login as Buyer
                        </Link>
                        <Link
                          href="/auth?role=vendor&next=/vendor"
                          className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                        >
                          Login as Vendor
                        </Link>
                        <Link
                          href="/auth?role=services&next=/services"
                          className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                        >
                          Login as Service Provider
                        </Link>
                        <div className="my-1 h-px bg-border" />
                        <button
                          type="button"
                          onClick={() => setProfileMenuMode('join')}
                          className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent transition"
                        >
                          Join MyGarage
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/auth?role=buyer&next=/buyer"
                          className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                        >
                          Join as Buyer
                        </Link>
                        <Link
                          href="/auth?role=vendor&next=/vendor"
                          className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                        >
                          Join as Vendor
                        </Link>
                        <Link
                          href="/auth?role=services&next=/services"
                          className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                        >
                          Join as Service Provider
                        </Link>
                        <div className="my-1 h-px bg-border" />
                        <button
                          type="button"
                          onClick={() => setProfileMenuMode('login')}
                          className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent transition"
                        >
                          My Account
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Open categories"
                aria-expanded={open}
                onMouseEnter={handleHoverOpen}
                onMouseLeave={scheduleHoverClose}
                onClick={togglePinned}
                className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground transition"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/icon0.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <span className="text-2xl font-bold text-foreground">MyGarage</span>
              </Link>
            </div>

            <Link
              href="/buyer/services"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 animate-pulse"
            >
              <Siren className="h-4 w-4" />
              <span>SOS</span>
            </Link>
            <form
              className="mx-6 flex max-w-md flex-1 items-center"
              onSubmit={(e) => {
                e.preventDefault();
                applySearch(searchValue, { closeSidebar: true });
              }}
            >
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search products & services..."
                  aria-label="Search products and services"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => {
                    showSuggestionsNow();
                  }}
                  onBlur={() => {
                    if (suggestionsBlurCloseTimerRef.current) window.clearTimeout(suggestionsBlurCloseTimerRef.current);
                    suggestionsBlurCloseTimerRef.current = window.setTimeout(() => {
                      closeSuggestions();
                    }, 120);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchValue('');
                      applySearch('', { closeSidebar: true });
                      closeSuggestions();
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />

                {suggestionsVisible && (searchValue.trim().length >= 2) ? (
                  <div
                    className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-popover shadow-lg z-50 overflow-hidden"
                    onMouseDown={(e) => {
                      // Prevent the input from losing focus before click/navigation.
                      e.preventDefault();
                    }}
                  >
                    <div className="p-3">
                      {suggestionsLoading ? (
                        <p className="text-xs text-muted-foreground">Searching…</p>
                      ) : suggestionsError ? (
                        <p className="text-xs text-muted-foreground">{suggestionsError}</p>
                      ) : suggestions &&
                        (suggestions.categories?.length ?? 0) === 0 &&
                        suggestions.products.length === 0 &&
                        (suggestions.serviceCategories?.length ?? 0) === 0 &&
                        (suggestions.services?.length ?? 0) === 0 ? (
                        <p className="text-xs text-muted-foreground">No matches found</p>
                      ) : null}

                      {suggestions &&
                      ((suggestions.categories?.length ?? 0) > 0 ||
                        suggestions.products.length > 0 ||
                        (suggestions.serviceCategories?.length ?? 0) > 0 ||
                        (suggestions.services?.length ?? 0) > 0) ? (
                        <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto overflow-x-hidden pb-1">
                          {(suggestions.categories?.length ?? 0) > 0 ? (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Browse categories
                              </p>
                              <div className="flex flex-col gap-2">
                                {(suggestions.categories ?? []).map((c) => (
                                  <Link
                                    key={c.name}
                                    href={buildCategoryHref(c.name)}
                                    className="group w-full rounded-lg border border-primary/20 bg-primary/5 transition hover:border-primary/35 hover:bg-primary/10"
                                    onClick={() => {
                                      closeSuggestions();
                                      closeSidebar();
                                    }}
                                  >
                                    <div className="flex items-center gap-3 px-2 py-2">
                                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted/40 ring-1 ring-border">
                                        <img
                                          src={c.image?.trim() ? c.image : '/placeholder.jpg'}
                                          alt={c.headline}
                                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold leading-snug text-foreground line-clamp-2">
                                          {c.headline}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                                          View all in {c.name}
                                        </p>
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {suggestions.products.length > 0 ? (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Top products
                              </p>
                              <div className="flex flex-col gap-2">
                                {suggestions.products.map((p) => (
                                  <Link
                                    key={p.id}
                                    href={buildCategoryHref(p.category)}
                                    className="group w-full rounded-lg border border-border bg-background transition hover:bg-accent"
                                    onClick={() => {
                                      closeSuggestions();
                                      closeSidebar();
                                    }}
                                  >
                                    <div className="flex items-center gap-3 px-2 py-2">
                                      <div className="h-12 w-12 overflow-hidden rounded-md bg-muted/40">
                                        <img
                                          src={p.image || '/placeholder.jpg'}
                                          alt={p.name}
                                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="line-clamp-1 text-xs font-medium text-foreground">{p.name}</p>
                                        <p className="line-clamp-1 text-[10px] text-muted-foreground">{p.category}</p>
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {(suggestions.serviceCategories?.length ?? 0) > 0 ? (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Browse service categories
                              </p>
                              <div className="flex flex-col gap-2">
                                {(suggestions.serviceCategories ?? []).map((sc) => (
                                  <Link
                                    key={sc.categoryId}
                                    href={buildServiceCategoryHref(sc.categoryId)}
                                    className="group w-full rounded-lg border border-amber-500/25 bg-amber-500/5 transition hover:border-amber-500/40 hover:bg-amber-500/10"
                                    onClick={() => {
                                      closeSuggestions();
                                      closeSidebar();
                                    }}
                                  >
                                    <div className="flex items-center gap-3 px-2 py-2">
                                      <div
                                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-background text-2xl leading-none ring-1 ring-border"
                                        aria-hidden
                                      >
                                        {sc.emoji}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
                                          {sc.headline}
                                        </p>
                                        <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                                          <span className="line-clamp-1">{sc.topServiceName}</span>
                                          <span className="text-muted-foreground/80"> · Browse category</span>
                                        </p>
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {(suggestions.services?.length ?? 0) > 0 ? (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Services
                              </p>
                              <div className="flex flex-col gap-2">
                                {(suggestions.services ?? []).map((s) => (
                                  <Link
                                    key={s.id}
                                    href={buildServiceHref(s.categoryId, s.name)}
                                    className="group w-full rounded-lg border border-border bg-background transition hover:bg-accent"
                                    onClick={() => {
                                      closeSuggestions();
                                      closeSidebar();
                                    }}
                                  >
                                    <div className="flex items-center gap-3 px-2 py-2">
                                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                        <Wrench className="h-5 w-5" aria-hidden />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-xs font-medium text-foreground">{s.name}</p>
                                        <p className="line-clamp-1 text-[10px] text-muted-foreground">{s.categoryTitle}</p>
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </form>

            <Link
              href="/cart"
              className="relative flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Cart</span>
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-red-700 bg-red-600 px-1 text-[11px] font-semibold text-white shadow-sm">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </Link>
            <div
              ref={desktopProfileMenuRef}
              className="relative ml-2"
              onMouseEnter={handleProfileHoverOpen}
              onMouseLeave={scheduleProfileHoverClose}
            >
              <button
                type="button"
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
                onClick={toggleProfileMenu}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition"
              >
                <UserCircle2 className="h-5 w-5" />
                <ChevronDown className="h-4 w-4" />
              </button>
              {profileMenuOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg z-50">
                  {profileMenuMode === 'login' ? (
                    <>
                      <Link
                        href="/auth?role=buyer&next=/buyer"
                        className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                      >
                        Login as Buyer
                      </Link>
                      <Link
                        href="/auth?role=vendor&next=/vendor"
                        className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                      >
                        Login as Vendor
                      </Link>
                      <Link
                        href="/auth?role=services&next=/services"
                        className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                      >
                        Login as Service Provider
                      </Link>
                      <div className="my-1 h-px bg-border" />
                      <button
                        type="button"
                        onClick={() => setProfileMenuMode('join')}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent transition"
                      >
                        Join MyGarage
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth?role=buyer&next=/buyer"
                        className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                      >
                        Join as Buyer
                      </Link>
                      <Link
                        href="/auth?role=vendor&next=/vendor"
                        className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                      >
                        Join as Vendor
                      </Link>
                      <Link
                        href="/auth?role=services&next=/services"
                        className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                      >
                        Join as Service Provider
                      </Link>
                      <div className="my-1 h-px bg-border" />
                      <button
                        type="button"
                        onClick={() => setProfileMenuMode('login')}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent transition"
                      >
                        My Account
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
    <div className="md:hidden sticky top-0 z-40 border-t border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
        <Link
          href="/buyer/services"
          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 animate-pulse"
        >
          <Siren className="h-4 w-4" />
          <span>SOS</span>
        </Link>
        <form
          className="flex flex-1 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch(searchValue, { closeSidebar: true });
          }}
        >
          <div ref={mobileSearchFieldRef} className="relative w-full min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search products & services..."
              aria-label="Search products and services"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => {
                showSuggestionsNow();
              }}
              onBlur={() => {
                if (suggestionsBlurCloseTimerRef.current) window.clearTimeout(suggestionsBlurCloseTimerRef.current);
                suggestionsBlurCloseTimerRef.current = window.setTimeout(() => {
                  closeSuggestions();
                }, 120);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchValue('');
                  applySearch('', { closeSidebar: true });
                  closeSuggestions();
                }
              }}
              className="w-full min-w-0 rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {suggestionsVisible && (searchValue.trim().length >= 2) ? (
              <div
                className="fixed inset-x-0 z-[60] flex flex-col overflow-hidden rounded-b-2xl border-x-0 border-b border-border bg-popover/98 shadow-[0_16px_48px_rgba(0,0,0,0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-popover/90 dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
                style={{
                  top: mobileSuggestLayout?.top ?? 108,
                  maxHeight: mobileSuggestLayout?.maxHeight ?? 'calc(100dvh - 120px)',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                role="listbox"
                aria-label="Search suggestions"
              >
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
                  {suggestionsLoading ? (
                    <p className="py-3 text-center text-sm text-muted-foreground">Searching…</p>
                  ) : suggestionsError ? (
                    <p className="py-3 text-center text-sm text-muted-foreground">{suggestionsError}</p>
                  ) : suggestions &&
                    (suggestions.categories?.length ?? 0) === 0 &&
                    suggestions.products.length === 0 &&
                    (suggestions.serviceCategories?.length ?? 0) === 0 &&
                    (suggestions.services?.length ?? 0) === 0 ? (
                    <p className="py-3 text-center text-sm text-muted-foreground">No matches found</p>
                  ) : null}

                  {suggestions &&
                  ((suggestions.categories?.length ?? 0) > 0 ||
                    suggestions.products.length > 0 ||
                    (suggestions.serviceCategories?.length ?? 0) > 0 ||
                    (suggestions.services?.length ?? 0) > 0) ? (
                    <div className="space-y-3">
                      {(suggestions.categories?.length ?? 0) > 0 ? (
                        <div>
                          <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Browse categories
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {(suggestions.categories ?? []).map((c) => (
                              <Link
                                key={c.name}
                                href={buildCategoryHref(c.name)}
                                className="group flex min-h-12 w-full items-center rounded-xl border border-primary/20 bg-primary/5 px-2 py-2 transition active:scale-[0.99] hover:border-primary/35 hover:bg-primary/10"
                                onClick={() => {
                                  closeSuggestions();
                                  closeSidebar();
                                }}
                              >
                                <div className="flex w-full min-w-0 items-center gap-2.5">
                                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted/40 ring-1 ring-border">
                                    <img
                                      src={c.image?.trim() ? c.image : '/placeholder.jpg'}
                                      alt={c.headline}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1 text-left">
                                    <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
                                      {c.headline}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                                      {c.name}
                                    </p>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {suggestions.products.length > 0 ? (
                        <div>
                          <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Top products
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {suggestions.products.map((p) => (
                              <Link
                                key={p.id}
                                href={buildCategoryHref(p.category)}
                                className="group flex min-h-12 w-full items-center rounded-xl border border-border bg-background px-2 py-2 transition active:scale-[0.99] hover:bg-accent"
                                onClick={() => {
                                  closeSuggestions();
                                  closeSidebar();
                                }}
                              >
                                <div className="flex w-full min-w-0 items-center gap-2.5">
                                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                                    <img
                                      src={p.image || '/placeholder.jpg'}
                                      alt={p.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1 text-left">
                                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">{p.name}</p>
                                    <p className="line-clamp-1 text-[11px] text-muted-foreground">{p.category}</p>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {(suggestions.serviceCategories?.length ?? 0) > 0 ? (
                        <div>
                          <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Service categories
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {(suggestions.serviceCategories ?? []).map((sc) => (
                              <Link
                                key={sc.categoryId}
                                href={buildServiceCategoryHref(sc.categoryId)}
                                className="group flex min-h-12 w-full items-center rounded-xl border border-amber-500/25 bg-amber-500/5 px-2 py-2 transition active:scale-[0.99] hover:border-amber-500/40 hover:bg-amber-500/10"
                                onClick={() => {
                                  closeSuggestions();
                                  closeSidebar();
                                }}
                              >
                                <div className="flex w-full min-w-0 items-center gap-2.5">
                                  <div
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-xl leading-none ring-1 ring-border"
                                    aria-hidden
                                  >
                                    {sc.emoji}
                                  </div>
                                  <div className="min-w-0 flex-1 text-left">
                                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
                                      {sc.headline}
                                    </p>
                                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                                      {sc.topServiceName}
                                    </p>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {(suggestions.services?.length ?? 0) > 0 ? (
                        <div>
                          <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Services
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {(suggestions.services ?? []).map((s) => (
                              <Link
                                key={s.id}
                                href={buildServiceHref(s.categoryId, s.name)}
                                className="group flex min-h-12 w-full items-center rounded-xl border border-border bg-background px-2 py-2 transition active:scale-[0.99] hover:bg-accent"
                                onClick={() => {
                                  closeSuggestions();
                                  closeSidebar();
                                }}
                              >
                                <div className="flex w-full min-w-0 items-center gap-2.5">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Wrench className="h-5 w-5" aria-hidden />
                                  </div>
                                  <div className="min-w-0 flex-1 text-left">
                                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">{s.name}</p>
                                    <p className="line-clamp-1 text-[11px] text-muted-foreground">{s.categoryTitle}</p>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </form>
        <Link
          href="/cart"
          className="relative inline-flex items-center gap-1 bg-primary text-primary-foreground px-2 py-2 rounded-lg hover:bg-primary/90 transition text-xs"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Cart</span>
          {cartCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-red-700 bg-red-600 px-1 text-[10px] font-semibold text-white shadow-sm">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          ) : null}
        </Link>
      </div>
    </div>
    </>
  );
}
