'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Store, User, Wrench } from 'lucide-react';

import { useCartItems } from '@/hooks/use-cart-items';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/buyer/services', label: 'Services', icon: Wrench, match: 'services' },
  { href: '/', label: 'Shop', icon: Store, match: 'shop' },
  { href: '/cart', label: 'Cart', icon: ShoppingCart, match: 'cart' },
  { href: '/buyer/profile', label: 'Profile', icon: User, match: 'profile' },
] as const;

export type MobileAppTab = (typeof tabs)[number]['match'];

/** Buyer-facing mobile app hides the tab bar on other portals. */
export function shouldHideMobileAppFooter(pathname: string): boolean {
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/vendor')) return true;
  if (pathname === '/services' || pathname.startsWith('/services/')) return true;
  return false;
}

export function mobileAppTabFromPath(pathname: string): MobileAppTab {
  if (pathname.startsWith('/cart') || pathname.startsWith('/checkout')) return 'cart';
  if (
    pathname.startsWith('/buyer/profile') ||
    pathname === '/buyer' ||
    pathname.startsWith('/buyer/orders') ||
    pathname.startsWith('/buyer/garage') ||
    pathname.startsWith('/buyer/addresses') ||
    pathname.startsWith('/buyer/wishlist') ||
    pathname.startsWith('/buyer/support')
  ) {
    return 'profile';
  }
  if (pathname.startsWith('/buyer/services') || pathname.startsWith('/buyer/service')) return 'services';
  if (pathname === '/' || pathname.startsWith('/product') || pathname.startsWith('/category')) return 'shop';
  return 'shop';
}

export function MobileAppBottomNav({
  active,
  cartCount,
  docked = false,
}: {
  active?: MobileAppTab;
  cartCount?: number;
  /** Sit in the layout instead of covering the page (use in the buyer portal). */
  docked?: boolean;
}) {
  const pathname = usePathname();
  const cart = useCartItems();
  const selected = active ?? mobileAppTabFromPath(pathname);
  const count = cartCount ?? cart.unitCount;

  return (
    <nav
      className={cn(
        'border-t border-[#EEF2F7] bg-white md:hidden',
        docked
          ? 'relative z-40 shrink-0 shadow-[0_-4px_24px_rgba(11,18,32,0.08)]'
          : 'fixed inset-x-0 bottom-0 z-40 shadow-[0_-4px_24px_rgba(11,18,32,0.08)]',
      )}
      aria-label="App"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = tab.match === selected;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.match}
              href={tab.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-12 items-center justify-center rounded-full',
                  isActive && 'bg-primary/12',
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                  {tab.match === 'cart' && count > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                      {count > 99 ? '99+' : count}
                    </span>
                  ) : null}
                </span>
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
