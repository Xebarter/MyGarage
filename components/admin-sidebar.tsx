'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  Users,
  Tag,
  Truck,
  Home,
  Wallet,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/promotions', label: 'Promotions', icon: Tag },
  { href: '/admin/vendors', label: 'Vendors', icon: Truck },
  { href: '/admin/service-providers', label: 'Service Providers', icon: Truck },
  { href: '/admin/payments', label: 'Payments', icon: Wallet },
];

type AdminSidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    onMobileClose?.();
  }, [pathname, onMobileClose]);

  const handleLogout = async () => {
    onMobileClose?.();
    await supabase.auth.signOut();
    router.push('/auth?role=admin&next=/admin');
  };

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          'relative z-50 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground',
          'transition-transform duration-200 ease-out md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'fixed inset-y-0 left-0 md:static',
        )}
      >
        <div className="flex items-center justify-between gap-2 p-6 pb-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-2" onClick={onMobileClose}>
            <Package className="h-8 w-8 shrink-0" />
            <span className="truncate text-xl font-bold">MyGarage</span>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
            aria-label="Close menu"
            onClick={onMobileClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav id="admin-dashboard-nav" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 transition',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-border p-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-1 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={onMobileClose}
          >
            Back to Store
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left text-sm text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
