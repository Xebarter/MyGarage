'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Siren,
  Store,
  UserCircle2,
  Wrench,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuyerPortalChrome } from '@/components/buyer-portal-chrome';
import { useVendorPortalChrome } from '@/components/vendor-portal-chrome';
import { useServicesPortalChrome } from '@/components/services-portal-chrome';
import {
  flattenSearchActions,
  SearchClearButton,
  SearchSuggestionsPanel,
  type SearchSuggestionsPayload,
} from '@/components/search/search-suggestions-panel';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { AddItemsSidebar } from '@/components/additems-sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { getAuthAvatarUrl, getAuthDisplayInitials, userHasAdminPortalAccess } from '@/lib/auth-avatar';

const SEARCH_RECENT_KEY = 'mygarage.search.recent';
const SEARCH_RECENT_LIMIT = 8;

const profileMenuPanelClass =
  'absolute right-0 z-50 mt-2.5 w-[min(calc(100vw-2rem),18rem)] overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xl ring-1 ring-black/[0.04] dark:ring-white/[0.08]';

type ProfileMenuAccent = 'buyer' | 'vendor' | 'services' | 'admin' | 'signout';

const profileMenuAccentStyles: Record<
  ProfileMenuAccent,
  { iconWrap: string; icon: string }
> = {
  buyer: {
    iconWrap: 'bg-primary/12 ring-1 ring-primary/20',
    icon: 'text-primary',
  },
  vendor: {
    iconWrap: 'bg-amber-500/12 ring-1 ring-amber-500/25',
    icon: 'text-amber-700 dark:text-amber-400',
  },
  services: {
    iconWrap: 'bg-violet-500/12 ring-1 ring-violet-500/25',
    icon: 'text-violet-700 dark:text-violet-400',
  },
  admin: {
    iconWrap: 'bg-slate-500/12 ring-1 ring-slate-500/25',
    icon: 'text-slate-700 dark:text-slate-300',
  },
  signout: {
    iconWrap: 'bg-destructive/10 ring-1 ring-destructive/20',
    icon: 'text-destructive',
  },
};

function HeaderProfileAvatar({
  user,
  size = 'md',
}: {
  user: User | null;
  size?: 'md' | 'lg';
}) {
  const url = getAuthAvatarUrl(user);
  const initials = getAuthDisplayInitials(user);
  const sizeClass = size === 'lg' ? 'h-10 w-10 sm:h-11 sm:w-11' : 'h-7 w-7 sm:h-8 sm:w-8';
  const fallbackText = size === 'lg' ? 'text-sm' : 'text-[10px] sm:text-xs';

  if (!user) {
    return <UserCircle2 className={cn('shrink-0 text-muted-foreground', size === 'lg' ? 'h-6 w-6' : 'h-5 w-5')} aria-hidden />;
  }
  return (
    <Avatar className={cn('shrink-0 border-2 border-background shadow-sm ring-1 ring-border/80', sizeClass)}>
      <AvatarImage src={url ?? undefined} alt="" referrerPolicy="no-referrer" className="object-cover" />
      <AvatarFallback className={cn('bg-primary/10 font-semibold text-primary', fallbackText)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function ProfileMenuItem({
  href,
  icon: Icon,
  label,
  accent,
  onClick,
}: {
  href?: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  accent: ProfileMenuAccent;
  onClick?: () => void;
}) {
  const tones = profileMenuAccentStyles[accent];
  const className = cn(
    'group flex w-full min-h-11 items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition',
    'hover:bg-muted/60 active:scale-[0.99]',
  );

  const content = (
    <>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-[1.02]',
          tones.iconWrap,
        )}
      >
        <Icon className={cn('h-[18px] w-[18px]', tones.icon)} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-foreground">{label}</span>
      {href ? (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-muted-foreground"
          aria-hidden
        />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function HeaderProfileMenuBody({
  authUser,
  onSignOut,
}: {
  authUser: User | null;
  onSignOut: () => void;
}) {
  if (authUser) {
    const email = authUser.email ?? '';
    return (
      <>
        <div className="border-b border-border/70 bg-gradient-to-br from-primary/[0.07] via-card to-card px-4 py-4">
          <div className="flex items-center gap-3">
            <HeaderProfileAvatar user={authUser} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground" title={email || undefined}>
                {email || 'Account'}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-0.5 p-2">
          <ProfileMenuItem href="/buyer" icon={ShoppingBag} label="Buyer" accent="buyer" />
          <ProfileMenuItem href="/vendor" icon={Store} label="Vendor" accent="vendor" />
          <ProfileMenuItem href="/services/orders" icon={Wrench} label="Services" accent="services" />
          {userHasAdminPortalAccess(authUser) ? (
            <ProfileMenuItem href="/admin" icon={Shield} label="Admin" accent="admin" />
          ) : null}
        </div>
        <div className="border-t border-border/70 bg-muted/20 p-2">
          <ProfileMenuItem icon={LogOut} label="Sign out" accent="signout" onClick={onSignOut} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="border-b border-border/70 bg-gradient-to-br from-muted/50 via-card to-card px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Sign in</p>
      </div>
      <div className="space-y-0.5 p-2">
        <ProfileMenuItem href="/auth?role=buyer&next=/buyer" icon={ShoppingBag} label="Buyer" accent="buyer" />
        <ProfileMenuItem href="/auth?role=vendor&next=/vendor" icon={Store} label="Vendor" accent="vendor" />
        <ProfileMenuItem
          href="/auth?role=services&next=/services/orders"
          icon={Wrench}
          label="Services"
          accent="services"
        />
      </div>
    </>
  );
}

export function Header() {
  const router = useRouter();
  const [pinned, setPinned] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [authUser, setAuthUser] = useState<User | null>(null)
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

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setAuthUser(user)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const [urlQ, setUrlQ] = useState(() => {
    if (typeof window === 'undefined') return '';
    return (new URLSearchParams(window.location.search).get('q') ?? '').toString().trim();
  });
  const [searchValue, setSearchValue] = useState(urlQ);

  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestionsPayload | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [activeSuggestIndex, setActiveSuggestIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const suggestionsBlurCloseTimerRef = useRef<number | null>(null);
  const mobileSearchFieldRef = useRef<HTMLDivElement | null>(null);
  const [mobileSuggestLayout, setMobileSuggestLayout] = useState<{ top: number; maxHeight: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEARCH_RECENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      setRecentSearches(
        parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
          .slice(0, SEARCH_RECENT_LIMIT),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const persistRecent = useCallback((query: string) => {
    const next = query.trim();
    if (next.length < 2) return;
    setRecentSearches((prev) => {
      const updated = [next, ...prev.filter((item) => item.toLowerCase() !== next.toLowerCase())].slice(
        0,
        SEARCH_RECENT_LIMIT,
      );
      try {
        localStorage.setItem(SEARCH_RECENT_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(SEARCH_RECENT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

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
    (raw: string, opts?: { closeSidebar?: boolean; remember?: boolean }) => {
      const next = raw.trim();
      if (next.length > 0) {
        router.replace(`/?q=${encodeURIComponent(next)}`);
        setUrlQ(next);
        if (opts?.remember !== false) persistRecent(next);
      } else {
        router.replace('/');
        setUrlQ('');
      }
      setSuggestionsVisible(false);
      setActiveSuggestIndex(-1);
      if (opts?.closeSidebar) closeSidebar();
    },
    [router, closeSidebar, persistRecent],
  );

  // Live suggestions while typing (URL updates only on submit / explicit pick).
  useEffect(() => {
    if (!suggestionsVisible) return;

    const q = searchValue.trim();
    if (q.length < 2) {
      setSuggestions(null);
      setSuggestionsError(null);
      setSuggestionsLoading(false);
      setActiveSuggestIndex(-1);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        setSuggestionsError(null);

        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(q)}&limitProducts=8&limitCategories=5&limitServices=5&limitServiceCategories=4`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as SearchSuggestionsPayload;
        if (!res.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        if (cancelled) return;
        setSuggestions(data);
        setActiveSuggestIndex(0);
      } catch (e) {
        if (cancelled) return;
        if ((e as Error)?.name === 'AbortError') return;
        setSuggestions(null);
        setSuggestionsError('Could not load suggestions');
        setActiveSuggestIndex(-1);
      } finally {
        if (cancelled) return;
        setSuggestionsLoading(false);
      }
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      controller.abort();
    };
  }, [searchValue, suggestionsVisible]);

  const suggestionActions = useMemo(
    () => flattenSearchActions(suggestions, searchValue, recentSearches),
    [suggestions, searchValue, recentSearches],
  );

  useLayoutEffect(() => {
    if (!suggestionsVisible || (searchValue.trim().length < 2 && recentSearches.length === 0)) {
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
  }, [suggestionsVisible, searchValue, recentSearches.length]);

  const closeSuggestions = useCallback(() => {
    setSuggestionsVisible(false);
    setActiveSuggestIndex(-1);
  }, []);

  const showSuggestionsNow = useCallback(() => {
    if (suggestionsBlurCloseTimerRef.current) window.clearTimeout(suggestionsBlurCloseTimerRef.current);
    setSuggestionsVisible(true);
  }, []);

  const activateSuggestion = useCallback(
    (index: number) => {
      const item = suggestionActions[index];
      if (!item) {
        applySearch(searchValue, { closeSidebar: true });
        return;
      }
      switch (item.kind) {
        case 'recent':
        case 'search-all':
          applySearch(item.query, { closeSidebar: true });
          break;
        case 'category':
          persistRecent(searchValue.trim() || item.category.name);
          router.push(`/category/products/${encodeURIComponent(item.category.name)}`);
          closeSuggestions();
          closeSidebar();
          break;
        case 'product':
          persistRecent(searchValue.trim() || item.product.name);
          router.push(`/products/${item.product.id}`);
          closeSuggestions();
          closeSidebar();
          break;
        case 'service-category':
          persistRecent(searchValue.trim() || item.category.categoryTitle);
          router.push(`/buyer/services?sc=${encodeURIComponent(item.category.categoryId)}&quick=1`);
          closeSuggestions();
          closeSidebar();
          break;
        case 'service':
          persistRecent(searchValue.trim() || item.service.name);
          router.push(
            `/buyer/services?sc=${encodeURIComponent(item.service.categoryId)}&ss=${encodeURIComponent(item.service.name)}&quick=1`,
          );
          closeSuggestions();
          closeSidebar();
          break;
      }
    },
    [suggestionActions, applySearch, searchValue, persistRecent, router, closeSuggestions, closeSidebar],
  );

  const handleSearchKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        if (searchValue) {
          setSearchValue('');
          applySearch('', { closeSidebar: true, remember: false });
        }
        closeSuggestions();
        return;
      }

      if (!suggestionsVisible) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          showSuggestionsNow();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (suggestionActions.length === 0) return;
        setActiveSuggestIndex((prev) => (prev + 1) % suggestionActions.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (suggestionActions.length === 0) return;
        setActiveSuggestIndex((prev) => (prev <= 0 ? suggestionActions.length - 1 : prev - 1));
        return;
      }

      if (e.key === 'Enter') {
        if (activeSuggestIndex >= 0 && suggestionActions[activeSuggestIndex]) {
          e.preventDefault();
          activateSuggestion(activeSuggestIndex);
        }
      }
    },
    [
      searchValue,
      applySearch,
      closeSuggestions,
      suggestionsVisible,
      showSuggestionsNow,
      suggestionActions,
      activeSuggestIndex,
      activateSuggestion,
    ],
  );

  const buyerChrome = useBuyerPortalChrome();
  const vendorChrome = useVendorPortalChrome();
  const servicesChrome = useServicesPortalChrome();
  const accountPortalChrome = buyerChrome ?? vendorChrome ?? servicesChrome;
  const inAccountPortal = accountPortalChrome != null;
  const accountPortalHome = buyerChrome
    ? '/buyer'
    : vendorChrome
      ? '/vendor'
      : servicesChrome
        ? '/services'
        : '/';

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
    buyerChrome?.setMobileNavOpen(false)
    vendorChrome?.setMobileNavOpen(false)
    servicesChrome?.setMobileNavOpen(false)
    setPinned((prev) => {
      const next = !prev
      if (next) setHoverOpen(true)
      else setHoverOpen(false)
      return next
    })
  }, [buyerChrome, vendorChrome, servicesChrome])

  const handleMobileLeadingAction = useCallback(() => {
    if (inAccountPortal && accountPortalChrome) {
      if (open) closeSidebar()
      accountPortalChrome.toggleMobileNav()
      return
    }
    togglePinned()
  }, [inAccountPortal, accountPortalChrome, open, closeSidebar, togglePinned])

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
    }, 150)
  }, [])

  const toggleProfileMenu = useCallback(() => {
    setProfileMenuOpen((prev) => !prev)
  }, [])

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    try {
      localStorage.removeItem('currentBuyerName')
      localStorage.removeItem('currentBuyerEmail')
      localStorage.removeItem('currentBuyerId')
      localStorage.removeItem('buyerProfile')
      localStorage.removeItem('currentVendorId')
      localStorage.removeItem('currentVendorName')
      localStorage.removeItem('currentServiceProviderName')
      localStorage.removeItem('currentServiceProviderServices')
    } catch {
      /* noop */
    }
    await supabase.auth.signOut()
    setProfileMenuOpen(false)
    setAuthUser(null)
    window.location.href = '/'
  }, [])

  return (
    <>
    <header className="border-b border-border bg-background md:sticky md:top-0 md:z-40">
      {open ? (
        <div
          className="fixed inset-x-0 top-14 md:top-16 bottom-0 z-40 bg-black/20 backdrop-blur-sm"
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
        <div className="mx-auto w-full max-w-none px-2 sm:px-2.5 md:px-3">
          <div className="flex items-center justify-between h-14">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                aria-label={
                  inAccountPortal
                    ? accountPortalChrome?.mobileNavOpen
                      ? 'Close portal navigation'
                      : 'Open portal navigation'
                    : 'Open categories'
                }
                aria-expanded={inAccountPortal ? accountPortalChrome?.mobileNavOpen : open}
                onMouseEnter={inAccountPortal ? undefined : handleHoverOpen}
                onMouseLeave={inAccountPortal ? undefined : scheduleHoverClose}
                onClick={handleMobileLeadingAction}
                className="inline-flex shrink-0 items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground transition"
              >
                {inAccountPortal ? (
                  accountPortalChrome?.mobileNavOpen ? (
                    <X className="h-5 w-5" aria-hidden />
                  ) : (
                    <LayoutDashboard className="h-5 w-5" aria-hidden />
                  )
                ) : (
                  <Menu className="h-5 w-5" aria-hidden />
                )}
              </button>
              <Link href={accountPortalHome} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <Image
                  src="/icon0.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 object-contain"
                />
                <span className="shrink-0 text-base font-bold text-foreground sm:text-lg">MyGarage</span>
                {inAccountPortal && accountPortalChrome ? (
                  <>
                    <span className="shrink-0 text-muted-foreground/80" aria-hidden>
                      ·
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground sm:text-sm">
                      {accountPortalChrome.activePageLabel}
                    </span>
                  </>
                ) : null}
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
                  aria-label={authUser ? `Account menu (${authUser.email ?? 'signed in'})` : 'Open profile menu'}
                  aria-expanded={profileMenuOpen}
                  onClick={toggleProfileMenu}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-sm text-foreground shadow-sm transition hover:border-primary/25 hover:bg-accent sm:px-3 sm:py-2"
                >
                  <HeaderProfileAvatar user={authUser} />
                  <ChevronDown
                    className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', profileMenuOpen && 'rotate-180')}
                    aria-hidden
                  />
                </button>
                {profileMenuOpen ? (
                  <div className={profileMenuPanelClass}>
                    <HeaderProfileMenuBody authUser={authUser} onSignOut={handleSignOut} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block border-b border-border bg-background">
        <div className="mx-auto w-full max-w-none px-2 sm:px-2.5 md:px-3">
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
              className="mx-6 flex max-w-lg flex-1 items-center"
              onSubmit={(e) => {
                e.preventDefault();
                if (activeSuggestIndex >= 0 && suggestionActions[activeSuggestIndex]) {
                  activateSuggestion(activeSuggestIndex);
                  return;
                }
                applySearch(searchValue, { closeSidebar: true });
              }}
            >
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search parts, brands, categories, services…"
                  aria-label="Search products and services"
                  aria-autocomplete="list"
                  aria-expanded={suggestionsVisible}
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setActiveSuggestIndex(-1);
                    showSuggestionsNow();
                  }}
                  onFocus={() => {
                    showSuggestionsNow();
                  }}
                  onBlur={() => {
                    if (suggestionsBlurCloseTimerRef.current) window.clearTimeout(suggestionsBlurCloseTimerRef.current);
                    suggestionsBlurCloseTimerRef.current = window.setTimeout(() => {
                      closeSuggestions();
                    }, 140);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <SearchClearButton
                  visible={searchValue.length > 0}
                  onClear={() => {
                    setSearchValue('');
                    applySearch('', { closeSidebar: true, remember: false });
                    showSuggestionsNow();
                  }}
                />

                {suggestionsVisible && (searchValue.trim().length >= 2 || recentSearches.length > 0) ? (
                  <SearchSuggestionsPanel
                    query={searchValue}
                    suggestions={suggestions}
                    loading={suggestionsLoading}
                    error={suggestionsError}
                    recent={recentSearches}
                    activeIndex={activeSuggestIndex}
                    variant="desktop"
                    onHoverIndex={setActiveSuggestIndex}
                    onPickRecent={(q) => applySearch(q, { closeSidebar: true })}
                    onClearRecent={clearRecentSearches}
                    onNavigate={() => {
                      persistRecent(searchValue.trim());
                      closeSuggestions();
                      closeSidebar();
                    }}
                  />
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
                aria-label={authUser ? `Account menu (${authUser.email ?? 'signed in'})` : 'Open profile menu'}
                aria-expanded={profileMenuOpen}
                onClick={toggleProfileMenu}
                className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background px-3 py-2 text-sm text-foreground shadow-sm transition hover:border-primary/25 hover:bg-accent"
              >
                <HeaderProfileAvatar user={authUser} />
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', profileMenuOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {profileMenuOpen ? (
                <div className={profileMenuPanelClass}>
                  <HeaderProfileMenuBody authUser={authUser} onSignOut={handleSignOut} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
    <div className="md:hidden sticky top-0 z-40 border-t border-b border-border bg-background">
      <div className="mx-auto w-full max-w-none px-2 sm:px-2.5 md:px-3 py-2 flex items-center gap-2">
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
            if (activeSuggestIndex >= 0 && suggestionActions[activeSuggestIndex]) {
              activateSuggestion(activeSuggestIndex);
              return;
            }
            applySearch(searchValue, { closeSidebar: true });
          }}
        >
          <div ref={mobileSearchFieldRef} className="relative w-full min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search parts & services…"
              aria-label="Search products and services"
              aria-autocomplete="list"
              aria-expanded={suggestionsVisible}
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setActiveSuggestIndex(-1);
                showSuggestionsNow();
              }}
              onFocus={() => {
                showSuggestionsNow();
              }}
              onBlur={() => {
                if (suggestionsBlurCloseTimerRef.current) window.clearTimeout(suggestionsBlurCloseTimerRef.current);
                suggestionsBlurCloseTimerRef.current = window.setTimeout(() => {
                  closeSuggestions();
                }, 140);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full min-w-0 rounded-xl border border-border bg-background py-2.5 pl-9 pr-9 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <SearchClearButton
              visible={searchValue.length > 0}
              onClear={() => {
                setSearchValue('');
                applySearch('', { closeSidebar: true, remember: false });
                showSuggestionsNow();
              }}
            />

            {suggestionsVisible && (searchValue.trim().length >= 2 || recentSearches.length > 0) ? (
              <SearchSuggestionsPanel
                query={searchValue}
                suggestions={suggestions}
                loading={suggestionsLoading}
                error={suggestionsError}
                recent={recentSearches}
                activeIndex={activeSuggestIndex}
                variant="mobile"
                className="bg-popover/98 shadow-[0_16px_48px_rgba(0,0,0,0.14)] supports-[backdrop-filter]:bg-popover/90"
                style={{
                  top: mobileSuggestLayout?.top ?? 108,
                  maxHeight: mobileSuggestLayout?.maxHeight ?? 'calc(100dvh - 120px)',
                }}
                onHoverIndex={setActiveSuggestIndex}
                onPickRecent={(q) => applySearch(q, { closeSidebar: true })}
                onClearRecent={clearRecentSearches}
                onNavigate={() => {
                  persistRecent(searchValue.trim());
                  closeSuggestions();
                  closeSidebar();
                }}
              />
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
