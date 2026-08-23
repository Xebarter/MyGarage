'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Bell,
  Car,
  ChevronRight,
  CreditCard,
  Crown,
  FolderOpen,
  Heart,
  LifeBuoy,
  LineChart,
  LogOut,
  MapPin,
  Receipt,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  UserRound,
  Wrench,
} from 'lucide-react';

import { MobileAppPage } from '@/components/mobile-app-chrome';
import { createClient } from '@/lib/supabase/client';
import { formatUgx } from '@/lib/format-ugx';
import { cn } from '@/lib/utils';

type HubProfile = {
  customer: {
    name: string;
    email: string;
    phone: string;
    totalOrders: number;
    totalSpent: number;
  };
  stats: {
    wishlistItems?: number;
    vehicles?: number;
  };
};

type HubPayload = {
  profile: HubProfile;
  unreadNotificationCount?: number;
  subscription?: { planTier?: string | null } | null;
};

const QUICK = [
  { href: '/buyer/garage', label: 'Garage', icon: Car },
  { href: '/buyer/orders', label: 'Orders', icon: Receipt },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/buyer/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/buyer/addresses', label: 'Addresses', icon: MapPin },
  { href: '/buyer/support', label: 'Support', icon: LifeBuoy },
  { href: '/buyer/services', label: 'Services', icon: Wrench },
] as const;

const HUB = [
  { href: '/buyer/profile?tab=account', title: 'Account', subtitle: 'Name, phone, password, security', icon: UserRound },
  { href: '/buyer/profile?tab=notifications', title: 'Alerts', subtitle: 'Notifications & preferences', icon: Bell },
  { href: '/buyer/profile?tab=billing', title: 'Billing', subtitle: 'Payments & pending totals', icon: CreditCard },
  { href: '/buyer/profile?tab=membership', title: 'Membership', subtitle: 'Plans & subscription', icon: Crown },
  { href: '/buyer/profile?tab=documents', title: 'Documents', subtitle: 'Logbooks, insurance & expiry', icon: FolderOpen },
  { href: '/buyer/profile?tab=services', title: 'Services activity', subtitle: 'Requests, ratings, tips from providers', icon: Wrench },
  { href: '/buyer/profile?tab=insights', title: 'Insights', subtitle: 'Spend & vehicle health', icon: LineChart },
  { href: '/buyer/profile?tab=settings', title: 'Settings', subtitle: 'Service mode, units & theme', icon: SlidersHorizontal },
] as const;

function resolveCustomerId(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem('currentBuyerId') || '').trim();
}

export function MobileProfileHub() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [data, setData] = useState<HubPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const load = useCallback(async () => {
    const localId = resolveCustomerId();
    const localEmail = (localStorage.getItem('currentBuyerEmail') || '').trim();
    setEmail(localEmail);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const hasSession = Boolean(auth.user);
    const hasLocal = Boolean(localId || localEmail);
    if (!hasSession && !hasLocal) {
      setSignedIn(false);
      setData(null);
      return;
    }
    setSignedIn(true);

    let customerId = localId;
    try {
      if (!customerId && localEmail) {
        const res = await fetch(`/api/buyer/profile?email=${encodeURIComponent(localEmail)}`);
        if (res.ok) {
          const body = (await res.json()) as { customer?: { id?: string } };
          customerId = body.customer?.id ?? '';
          if (customerId) localStorage.setItem('currentBuyerId', customerId);
        }
      }
      if (!customerId) {
        setData(null);
        return;
      }
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/buyer/control-center?customerId=${encodeURIComponent(customerId)}`);
      if (!res.ok) {
        setError('Could not load account details.');
        setData(null);
        return;
      }
      setData((await res.json()) as HubPayload);
    } catch {
      setError('Could not load account details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = async () => {
    if (!window.confirm('Sign out? You can sign back in anytime.')) return;
    const supabase = createClient();
    localStorage.removeItem('currentBuyerId');
    localStorage.removeItem('currentBuyerEmail');
    localStorage.removeItem('currentBuyerName');
    localStorage.removeItem('buyerProfile');
    await supabase.auth.signOut();
    router.push('/');
  };

  const profile = data?.profile;
  const name = profile?.customer.name?.trim() || localStorageName() || 'Buyer';
  const displayEmail = profile?.customer.email || email;
  const unread = data?.unreadNotificationCount ?? 0;
  const membership = data?.subscription?.planTier?.trim() || '';

  return (
    <MobileAppPage>
      <div className="px-4 pb-6 pt-3">
        {signedIn ? (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              aria-label="Refresh"
              disabled={loading}
              onClick={() => void load()}
              className="flex h-9 items-center gap-1.5 text-[13px] font-semibold text-primary"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
              Refresh
            </button>
          </div>
        ) : null}

        {signedIn === false ? (
          <GuestCard />
        ) : (
          <>
            {error ? <p className="mb-2 px-1 text-[13px] text-[#B91C1C]">{error}</p> : null}

            <section className="rounded-[22px] border border-border bg-white p-[18px] shadow-[0_8px_20px_rgba(11,18,32,0.05)]">
              <div className="flex items-center gap-3.5">
                <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-primary/12 text-2xl font-bold text-primary">
                  {(name[0] || 'M').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-[#0B1220]">{name}</p>
                  <p className="truncate text-[13px] text-[#8B9BB0]">{displayEmail}</p>
                  {profile?.customer.phone ? (
                    <p className="text-[13px] text-[#475569]">{profile.customer.phone}</p>
                  ) : null}
                  {membership ? (
                    <span className="mt-1.5 inline-flex rounded-full bg-primary/12 px-2.5 py-0.5 text-[11.5px] font-bold text-[#1E3A8A]">
                      {membership[0]!.toUpperCase()}
                      {membership.slice(1)} plan
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-1">
                <Stat label="Orders" value={`${profile?.customer.totalOrders ?? 0}`} />
                <Stat label="Spent" value={formatUgx(profile?.customer.totalSpent ?? 0)} />
                <Stat label="Vehicles" value={`${profile?.stats.vehicles ?? 0}`} />
                <Stat label="Wishlist" value={`${profile?.stats.wishlistItems ?? 0}`} />
              </div>
              {unread > 0 ? (
                <Link
                  href="/buyer/profile?tab=notifications"
                  className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#FEF3C7] px-3 py-2.5"
                >
                  <Bell className="h-[18px] w-[18px] text-[#B45309]" aria-hidden />
                  <span className="flex-1 text-[13px] font-semibold text-[#0B1220]">
                    You have {unread} unread alert{unread === 1 ? '' : 's'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#8B9BB0]" aria-hidden />
                </Link>
              ) : null}
            </section>

            <p className="mt-5 px-1 text-[13px] font-bold tracking-wide text-[#8B9BB0]">Quick access</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {QUICK.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center rounded-[14px] border border-border bg-white px-1.5 py-3.5"
                >
                  <item.icon className="h-[22px] w-[22px] text-primary" aria-hidden />
                  <span className="mt-1.5 text-center text-xs font-semibold text-[#0B1220]">{item.label}</span>
                </Link>
              ))}
            </div>

            <p className="mt-6 px-1 text-[13px] font-bold tracking-wide text-[#8B9BB0]">Account center</p>
            <div className="mt-2 space-y-2">
              {HUB.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-[14px] border border-border bg-white px-3.5 py-3.5"
                >
                  <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-primary/12 text-primary">
                    <item.icon className="h-[22px] w-[22px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-[#0B1220]">{item.title}</span>
                    <span className="block text-[12.5px] text-[#8B9BB0]">
                      {item.title === 'Alerts' && unread > 0
                        ? `${unread} unread · preferences`
                        : item.subtitle}
                    </span>
                  </span>
                  {item.title === 'Alerts' && unread > 0 ? (
                    <span className="mr-1 rounded-full bg-[#B91C1C] px-2 py-0.5 text-[11px] font-bold text-white">
                      {unread}
                    </span>
                  ) : null}
                  <ChevronRight className="h-5 w-5 text-[#8B9BB0]" aria-hidden />
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-[#FEE2E2] text-sm font-semibold text-[#B91C1C]"
            >
              <LogOut className="h-5 w-5" aria-hidden />
              Sign out
            </button>
          </>
        )}
      </div>
    </MobileAppPage>
  );
}

function localStorageName(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem('currentBuyerName') || '').trim();
}

function GuestCard() {
  return (
    <div className="rounded-[22px] bg-gradient-to-br from-[#1E3A8A] to-[#1E4ED8] p-[22px] text-white shadow-[0_12px_28px_rgba(11,18,32,0.12)]">
      <p className="text-[22px] font-bold tracking-tight">Welcome to MyGarage</p>
      <p className="mt-2 text-[15px] leading-relaxed text-white/88">
        Sign in to manage vehicles, orders, membership, documents, and preferences in one place.
      </p>
      <Link
        href="/auth?role=buyer&next=/buyer/profile"
        className="mt-[18px] flex h-12 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#1E3A8A]"
      >
        Sign in
      </Link>
      <Link href="/buyer/garage" className="mt-2.5 flex h-10 w-full items-center justify-center text-sm font-semibold text-white">
        Browse garage offline
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-[13.5px] font-bold text-[#0B1220]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#8B9BB0]">{label}</p>
    </div>
  );
}

const SECTION_TITLES: Record<string, string> = {
  account: 'Account',
  notifications: 'Alerts',
  billing: 'Billing',
  membership: 'Membership',
  documents: 'Documents',
  services: 'Services activity',
  insights: 'Insights',
  settings: 'Settings',
};

export function MobileProfileSectionChrome({
  tab,
  children,
}: {
  tab: string;
  children: ReactNode;
}) {
  return (
    <MobileAppPage>
      <div className="px-3 pb-6 pt-3">
        <Link href="/buyer/profile" className="mb-3 inline-block text-sm font-semibold text-primary">
          ← Profile
        </Link>
        <h1 className="mb-3 text-lg font-bold text-[#0B1220]">{SECTION_TITLES[tab] ?? 'Profile'}</h1>
        {children}
      </div>
    </MobileAppPage>
  );
}
