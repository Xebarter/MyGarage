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

const VENDOR_NAV_PAGES: { href: string; label: string }[] = [
  { href: '/vendor', label: 'Dashboard' },
  { href: '/vendor/products', label: 'Products' },
  { href: '/vendor/promotions', label: 'Promotions' },
  { href: '/vendor/orders', label: 'Orders' },
  { href: '/vendor/funds', label: 'Funds' },
  { href: '/vendor/customers', label: 'Customers' },
  { href: '/vendor/profile', label: 'Profile' },
  { href: '/vendor/pending', label: 'Pending' },
];

function resolveVendorPageLabel(pathname: string): string {
  const sorted = [...VENDOR_NAV_PAGES].sort((a, b) => b.href.length - a.href.length);
  for (const item of sorted) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }
  return 'Vendor';
}

type VendorPortalChromeContextValue = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  activePageLabel: string;
};

const VendorPortalChromeContext = createContext<VendorPortalChromeContextValue | null>(null);

export function VendorPortalChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const activePageLabel = useMemo(() => resolveVendorPageLabel(pathname), [pathname]);

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

  return <VendorPortalChromeContext.Provider value={value}>{children}</VendorPortalChromeContext.Provider>;
}

export function useVendorPortalChrome(): VendorPortalChromeContextValue | null {
  return useContext(VendorPortalChromeContext);
}
