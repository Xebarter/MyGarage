'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, LayoutDashboard, ShoppingBag, Heart, MapPin, User, LifeBuoy, ArrowLeft, LogOut, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function BuyerSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('Buyer');
  const [buyerEmail, setBuyerEmail] = useState('No email saved');
  const supabase = createClient();

  useEffect(() => {
    setBuyerName(localStorage.getItem('currentBuyerName') || 'Buyer');
    setBuyerEmail(localStorage.getItem('currentBuyerEmail') || 'No email saved');

    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted || !data.user) return;
      if (data.user.email) {
        setBuyerEmail(data.user.email);
        if (!localStorage.getItem('currentBuyerName')) {
          setBuyerName(data.user.email.split('@')[0]);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    localStorage.removeItem('currentBuyerName');
    localStorage.removeItem('currentBuyerEmail');
    localStorage.removeItem('buyerProfile');
    setBuyerName('Buyer');
    setBuyerEmail('No email saved');
    await supabase.auth.signOut();
    window.location.href = '/auth?role=buyer&next=/buyer';
  };

  const navItems = [
    { href: '/buyer', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/buyer/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/buyer/services', label: 'Services', icon: Wrench },
    { href: '/buyer/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/buyer/addresses', label: 'Addresses', icon: MapPin },
    { href: '/buyer/profile', label: 'Profile', icon: User },
    { href: '/buyer/support', label: 'Support', icon: LifeBuoy },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/80 bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground">MyGarage Buyer</h1>
          <p className="text-xs text-muted-foreground">{buyerName}</p>
        </div>
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          className="rounded-xl border border-border/70 bg-background/70 p-2 text-foreground transition hover:bg-accent"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

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
          <div className="hidden border-b border-border/70 bg-muted/20 p-6 md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">MyGarage Buyer</h1>
            <p className="mt-2 text-sm text-muted-foreground">{buyerName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{buyerEmail}</p>
          </div>

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

          <div className="space-y-2 border-t border-border/70 p-4">
            <Link
              href="/"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent/70"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
              Back to Shop
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4.5 w-4.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
