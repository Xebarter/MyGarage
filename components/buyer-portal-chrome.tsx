'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

const BUYER_NAV_PAGES: { href: string; label: string }[] = [
  { href: '/buyer', label: 'Dashboard' },
  { href: '/buyer/orders', label: 'Orders' },
  { href: '/buyer/services', label: 'Services' },
  { href: '/buyer/wishlist', label: 'Wishlist' },
  { href: '/buyer/addresses', label: 'Addresses' },
  { href: '/buyer/garage', label: 'My Garage' },
  { href: '/buyer/profile', label: 'Profile' },
  { href: '/buyer/support', label: 'Support' },
];

export function isBuyerAppPath(pathname: string): boolean {
  return (
    pathname === '/buyer' ||
    pathname.startsWith('/buyer/') ||
    pathname === '/buyer-dashboard' ||
    pathname.startsWith('/buyer-dashboard/')
  );
}

export function isBuyerGaragePath(pathname: string): boolean {
  return (
    pathname === '/buyer/garage' ||
    pathname.startsWith('/buyer/garage/') ||
    pathname === '/buyer-dashboard/garage' ||
    pathname.startsWith('/buyer-dashboard/garage/')
  );
}

/** Document scroll so the logo row can leave and the search row stays pinned. */
export function usesStorefrontHeaderScroll(pathname: string): boolean {
  return pathname === '/buyer/services' || isBuyerGaragePath(pathname);
}

function resolveBuyerPageLabel(pathname: string): string {
  const sorted = [...BUYER_NAV_PAGES].sort((a, b) => b.href.length - a.href.length);
  for (const item of sorted) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }
  return 'Account';
}

type BuyerPortalChromeContextValue = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  activePageLabel: string;
  /** Viewport offset so the drawer sits under the sticky search row. */
  mobileNavInsetTop: number;
  setMobileNavInsetTop: (px: number) => void;
};

const BuyerPortalChromeContext = createContext<BuyerPortalChromeContextValue | null>(null);

/** Mobile app header + buyer drawer share nav open state and the active page title. */
export function BuyerPortalChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileNavInsetTop, setMobileNavInsetTop] = useState(112);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const activePageLabel = useMemo(() => resolveBuyerPageLabel(pathname), [pathname]);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      mobileNavOpen,
      setMobileNavOpen,
      toggleMobileNav,
      activePageLabel,
      mobileNavInsetTop,
      setMobileNavInsetTop,
    }),
    [mobileNavOpen, toggleMobileNav, activePageLabel, mobileNavInsetTop],
  );

  return <BuyerPortalChromeContext.Provider value={value}>{children}</BuyerPortalChromeContext.Provider>;
}

export function useBuyerPortalChrome(): BuyerPortalChromeContextValue | null {
  return useContext(BuyerPortalChromeContext);
}
