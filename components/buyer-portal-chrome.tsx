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
  { href: '/buyer/profile', label: 'Profile' },
  { href: '/buyer/support', label: 'Support' },
];

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
};

const BuyerPortalChromeContext = createContext<BuyerPortalChromeContextValue | null>(null);

/** Mobile app header + buyer drawer share nav open state and the active page title. */
export function BuyerPortalChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    }),
    [mobileNavOpen, toggleMobileNav, activePageLabel],
  );

  return <BuyerPortalChromeContext.Provider value={value}>{children}</BuyerPortalChromeContext.Provider>;
}

export function useBuyerPortalChrome(): BuyerPortalChromeContextValue | null {
  return useContext(BuyerPortalChromeContext);
}
