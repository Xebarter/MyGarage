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

const SERVICES_NAV_PAGES: { href: string; label: string }[] = [
  { href: '/services', label: 'Dashboard' },
  { href: '/services/orders', label: 'Orders' },
  { href: '/services/myservices', label: 'My Services' },
  { href: '/services/customers', label: 'Customers' },
  { href: '/services/funds', label: 'Funds' },
  { href: '/services/promotions', label: 'Promotions' },
  { href: '/services/profile', label: 'Profile' },
  { href: '/services/pending', label: 'Pending' },
];

function resolveServicesPageLabel(pathname: string): string {
  const sorted = [...SERVICES_NAV_PAGES].sort((a, b) => b.href.length - a.href.length);
  for (const item of sorted) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }
  return 'Services';
}

type ServicesPortalChromeContextValue = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  activePageLabel: string;
};

const ServicesPortalChromeContext = createContext<ServicesPortalChromeContextValue | null>(null);

export function ServicesPortalChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const activePageLabel = useMemo(() => resolveServicesPageLabel(pathname), [pathname]);

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

  return <ServicesPortalChromeContext.Provider value={value}>{children}</ServicesPortalChromeContext.Provider>;
}

export function useServicesPortalChrome(): ServicesPortalChromeContextValue | null {
  return useContext(ServicesPortalChromeContext);
}
