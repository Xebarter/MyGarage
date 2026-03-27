'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Package, ShoppingCart, Users, Settings, LogOut, ArrowLeft, Menu, X, Megaphone, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function VendorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [vendorName, setVendorName] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    const currentVendorName = localStorage.getItem('currentVendorName');
    if (currentVendorName) {
      setVendorName(currentVendorName);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted || !data.user) return;
      const emailName = data.user.email?.split('@')[0] || 'Vendor';
      if (!currentVendorName) {
        setVendorName(emailName);
      }
    });

    return () => {
      mounted = false;
    };
  }, [supabase.auth]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    localStorage.removeItem('currentVendorId');
    localStorage.removeItem('currentVendorName');
    await supabase.auth.signOut();
    router.push('/auth?role=vendor&next=/vendor');
  };

  const navItems = [
    { href: '/vendor', label: 'Dashboard', icon: BarChart3 },
    { href: '/vendor/products', label: 'My Products', icon: Package },
    { href: '/vendor/promotions', label: 'Promotions', icon: Megaphone },
    { href: '/vendor/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/vendor/funds', label: 'Funds', icon: Wallet },
    { href: '/vendor/customers', label: 'Customers', icon: Users },
    { href: '/vendor/profile', label: 'Profile', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/80 bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground">MyGarage Vendor</h1>
          <p className="text-xs text-muted-foreground">{vendorName}</p>
        </div>
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          className="rounded-xl border border-border/70 bg-background/70 p-2 text-foreground transition hover:bg-accent"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Drawer + Backdrop */}
      {mobileMenuOpen && (
        <button
          aria-label="Close menu backdrop"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-border/70 bg-card/95 shadow-xl backdrop-blur transition-transform md:static md:z-auto md:translate-x-0 md:shadow-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="hidden border-b border-border/70 bg-muted/20 p-6 md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">MyGarage Vendor</h1>
            <p className="mt-2 text-sm text-muted-foreground">{vendorName}</p>
          </div>

          {mobileMenuOpen && (
            <div className="flex items-center justify-between border-b border-border/70 p-4 md:hidden">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
                <p className="mt-1 text-sm font-medium text-foreground">{vendorName}</p>
              </div>
              <button
                aria-label="Close navigation"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/95 text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-accent/70'
                  }`}
                >
                  {isActive && <span className="absolute left-1 top-2.5 h-5 w-1 rounded-full bg-primary-foreground/80" />}
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="space-y-2 border-t border-border/70 p-4">
            <Link
              href="/"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent/70"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
              Back to Site
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4.5 w-4.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
