'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Megaphone,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  X,
  Wallet,
  Store,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useServicesPortalChrome } from '@/components/services-portal-chrome';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/** Below merged mobile app header (top bar + search row). */
const SERVICES_MOBILE_CHROME_TOP = 'top-28';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/services', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/services/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/services/myservices', label: 'My Services', icon: BriefcaseBusiness },
  { href: '/services/customers', label: 'Customers', icon: Users },
  { href: '/services/funds', label: 'Funds', icon: Wallet },
  { href: '/services/promotions', label: 'Promotions', icon: Megaphone },
  { href: '/services/profile', label: 'Profile', icon: Settings },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/services') return pathname === '/services';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getProviderInitials(name: string, email: string): string {
  const cleaned = name.replace(/\s*\(service provider\)\s*/gi, '').trim();
  if (cleaned && cleaned !== 'Service Provider') {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    return cleaned.slice(0, 2).toUpperCase();
  }
  const local = email.split('@')[0]?.trim() ?? '';
  return (local.slice(0, 2) || 'SP').toUpperCase();
}

function displayProviderName(raw: string, email: string): string {
  const cleaned = raw.replace(/\s*\(service provider\)\s*/gi, '').trim();
  if (cleaned && cleaned !== 'Service Provider') return cleaned;
  return email.split('@')[0]?.trim() || 'Provider';
}

function ServicesSidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/services"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg outline-none ring-offset-background transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Image src="/icon0.svg" alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />
      <div className="min-w-0">
        <p className="text-sm font-bold tracking-tight text-foreground">MyGarage</p>
        <p className="text-[11px] font-medium text-muted-foreground">Services portal</p>
      </div>
    </Link>
  );
}

function ServicesSidebarUserCard({
  providerName,
  providerEmail,
  compact,
}: {
  providerName: string;
  providerEmail: string;
  compact?: boolean;
}) {
  const initials = useMemo(
    () => getProviderInitials(providerName, providerEmail),
    [providerName, providerEmail],
  );

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border/60 bg-background/80',
        compact ? 'px-3 py-2.5' : 'px-3 py-3 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]',
      )}
    >
      <Avatar className={cn('shrink-0 border border-border/80', compact ? 'h-9 w-9' : 'h-10 w-10')}>
        <AvatarFallback className="bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-400">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{providerName}</p>
        <p className="truncate text-xs text-muted-foreground">{providerEmail || '—'}</p>
      </div>
    </div>
  );
}

function ServicesSidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 md:px-4" aria-label="Service provider portal">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Menu</p>
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isNavActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/90 hover:bg-accent/80 hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-foreground/15 text-primary-foreground'
                      : 'bg-muted/80 text-muted-foreground group-hover:bg-background group-hover:text-foreground',
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
    </nav>
  );
}

function ServicesSidebarFooter({ onLogout, onNavigate }: { onLogout: () => void; onNavigate?: () => void }) {
  return (
    <div className="shrink-0 space-y-1 border-t border-border/70 bg-muted/20 p-3 md:p-4">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent/60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/80 text-muted-foreground">
          <Store className="h-4 w-4" aria-hidden />
        </span>
        Back to shop
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
          <LogOut className="h-4 w-4" aria-hidden />
        </span>
        Sign out
      </button>
    </div>
  );
}

export function ServiceProviderSidebar() {
  const pathname = usePathname();
  const portalChrome = useServicesPortalChrome();
  const [localMobileMenuOpen, setLocalMobileMenuOpen] = useState(false);
  const mobileMenuOpen = portalChrome?.mobileNavOpen ?? localMobileMenuOpen;
  const setMobileMenuOpen = portalChrome?.setMobileNavOpen ?? setLocalMobileMenuOpen;
  const usesMergedMobileHeader = portalChrome != null;
  const closeMobile = () => setMobileMenuOpen(false);
  const [providerName, setProviderName] = useState('Service Provider');
  const [providerEmail, setProviderEmail] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const storedName = localStorage.getItem('currentServiceProviderName') || 'Service Provider';
    setProviderName(storedName);

    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted || !data.user) return;
      const email = data.user.email ?? '';
      setProviderEmail(email);
      const uid = data.user.id?.trim();
      if (uid && !localStorage.getItem('currentVendorId')) {
        localStorage.setItem('currentVendorId', uid);
      }
      if (!localStorage.getItem('currentServiceProviderName') && email) {
        setProviderName(email.split('@')[0] || 'Service Provider');
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  const handleLogout = async () => {
    localStorage.removeItem('currentServiceProviderName');
    localStorage.removeItem('currentServiceProviderServices');
    localStorage.removeItem('currentVendorId');
    localStorage.removeItem('currentVendorName');
    await supabase.auth.signOut();
    window.location.href = '/auth?role=services&next=/services';
  };

  const displayName = useMemo(
    () => displayProviderName(providerName, providerEmail),
    [providerName, providerEmail],
  );

  return (
    <>
      {!usesMergedMobileHeader ? (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/80 bg-card px-4 py-3 shadow-sm md:hidden">
          <ServicesSidebarBrand />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="rounded-lg border border-border/70 bg-background p-2 text-foreground shadow-sm transition hover:bg-accent"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
          </button>
        </header>
      ) : null}

      {mobileMenuOpen ? (
        <button
          type="button"
          aria-label="Close menu backdrop"
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden',
            usesMergedMobileHeader ? SERVICES_MOBILE_CHROME_TOP : 'top-0',
          )}
          onClick={closeMobile}
        />
      ) : null}

      <aside
        className={cn(
          'fixed left-0 z-50 flex w-[min(100vw-1rem,17.5rem)] flex-col border-r border-border/80 bg-card shadow-2xl transition-transform duration-200 ease-out md:static md:z-auto md:h-full md:w-64 md:translate-x-0 md:shadow-none',
          usesMergedMobileHeader ? cn('bottom-0', SERVICES_MOBILE_CHROME_TOP) : 'inset-y-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-card via-card to-muted/25">
          <div className="shrink-0 border-b border-border/70 px-4 py-4 md:py-5">
            <div className="flex items-start justify-between gap-3">
              <ServicesSidebarBrand onNavigate={closeMobile} />
              {usesMergedMobileHeader ? (
                <button
                  type="button"
                  onClick={closeMobile}
                  aria-label="Close services navigation"
                  className="shrink-0 rounded-lg border border-border/70 bg-background p-2 text-foreground shadow-sm transition hover:bg-accent md:hidden"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
            <div className="mt-4">
              <ServicesSidebarUserCard
                providerName={displayName}
                providerEmail={providerEmail}
                compact={usesMergedMobileHeader}
              />
            </div>
          </div>

          <ServicesSidebarNav pathname={pathname} onNavigate={closeMobile} />
          <ServicesSidebarFooter onLogout={() => void handleLogout()} onNavigate={closeMobile} />
        </div>
      </aside>
    </>
  );
}
