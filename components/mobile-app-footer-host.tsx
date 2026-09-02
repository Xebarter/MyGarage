'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { MobileAppBottomNav, shouldHideMobileAppFooter } from '@/components/mobile-app-bottom-nav';

/** Persistent mobile tab bar for every storefront page. */
export function MobileAppFooterHost() {
  const pathname = usePathname();
  const hide = shouldHideMobileAppFooter(pathname);
  const buyerPortal =
    (pathname === '/buyer' || pathname.startsWith('/buyer/')) &&
    pathname !== '/buyer/services';

  useEffect(() => {
    const padBody = !hide && !buyerPortal;
    document.body.classList.toggle('has-mobile-app-footer', padBody);
    return () => document.body.classList.remove('has-mobile-app-footer');
  }, [hide, buyerPortal]);

  if (hide) return null;
  return <MobileAppBottomNav />;
}
