'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { resetPageScrollSoon } from '@/lib/reset-page-scroll';

/** Shared layouts (footer nav, shells) often keep the previous scroll offset. */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.hash) return;
    resetPageScrollSoon();
  }, [pathname]);

  return null;
}
