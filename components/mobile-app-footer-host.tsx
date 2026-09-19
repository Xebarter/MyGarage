'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { isBuyerAppPath } from '@/components/buyer-portal-chrome';
import { MobileAppBottomNav, shouldHideMobileAppFooter } from '@/components/mobile-app-bottom-nav';

/** Persistent mobile tab bar for storefront pages. Buyer routes own the bar in BuyerPortalShell. */
export function MobileAppFooterHost() {
  const pathname = usePathname();
  const hide = shouldHideMobileAppFooter(pathname) || isBuyerAppPath(pathname);

  useEffect(() => {
    const padBody = !hide;
    document.body.classList.toggle('has-mobile-app-footer', padBody);
    return () => document.body.classList.remove('has-mobile-app-footer');
  }, [hide]);

  if (hide) return null;
  return <MobileAppBottomNav />;
}
