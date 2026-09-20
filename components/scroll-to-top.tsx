'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { resetPageScrollSoon } from '@/lib/reset-page-scroll';

/** Shared layouts (footer nav, shells) often keep the previous scroll offset. */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    try {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (window.location.hash) return;
    resetPageScrollSoon();
  }, [pathname, search]);

  return null;
}
