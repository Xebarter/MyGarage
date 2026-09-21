'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  Users,
  Tag,
  Truck,
  Home,
  Wallet,
  BarChart3,
  X,
  LogOut,
  Banknote,
  MessageSquare,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { unregisterAdminPushToken } from '@/components/admin/admin-push-alerts';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: Home },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/pricing', label: 'Service pricing', icon: Banknote },
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/promotions', label: 'Promotions', icon: Tag },
    ],
  },
  {
    label: 'Network',
    items: [
      { href: '/admin/clients', label: 'Clients', icon: Users },
      { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
      { href: '/admin/vendors', label: 'Vendors & providers', icon: Truck },
      { href: '/admin/payments', label: 'Payments', icon: Wallet },
    ],
  },
] as const;

type AdminSidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    onMobileClose?.();
  }, [pathname, onMobileClose]);

  const handleLogout = async () => {
    onMobileClose?.();
    await unregisterAdminPushToken();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#12241C]/35 backdrop-blur-[2px] md:hidden"
          aria-label="Close menu"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          'no-print relative z-50 flex h-screen w-[16.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
          'transition-transform duration-200 ease-out md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'fixed inset-y-0 left-0 md:static',
        )}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E8C56B]" aria-hidden />

        <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-5">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5" onClick={onMobileClose}>
            <Image src="/icon0.svg" alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold tracking-tight">MyGarage</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Operations
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
            aria-label="Close menu"
            onClick={onMobileClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav id="admin-dashboard-nav" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                            isActive
                              ? 'bg-white/20 text-primary-foreground'
                              : 'bg-muted/70 text-muted-foreground group-hover:bg-background group-hover:text-foreground',
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-sidebar-border bg-muted/15 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
            onClick={onMobileClose}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/80">
              <Store className="h-4 w-4" aria-hidden />
            </span>
            Back to store
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50">
              <LogOut className="h-4 w-4" aria-hidden />
            </span>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
