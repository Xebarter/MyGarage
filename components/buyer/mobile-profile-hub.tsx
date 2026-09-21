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
  MessageCircle,
  Receipt,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  UserRound,
  Wrench,
} from 'lucide-react';

import { MobileAppBar, MobileAppPage } from '@/components/mobile-app-chrome';
import { createClient } from '@/lib/supabase/client';
import { isPlaceholderDisplayName } from '@/lib/display-name';
import { formatUgxCompact } from '@/lib/format-ugx';
import { formatE164Display, isPlaceholderEmail } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { openConciergeChat } from '@/lib/concierge/open';

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

const SHORTCUTS = [
  { href: '/buyer/garage', label: 'Garage', icon: Car },
  { href: '/buyer/orders', label: 'Orders', icon: Receipt },
  { href: '/buyer/services', label: 'Services', icon: Wrench },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
] as const;

type HubItem = {
  href: string;
  title: string;
  subtitle: string;
  icon: typeof UserRound;
  badgeKey?: 'alerts';
};

const GROUPS: { title: string; items: HubItem[] }[] = [
  {
    title: 'Your account',
    items: [
      { href: '/buyer/profile?tab=account', title: 'Personal details', subtitle: 'Name, phone & security', icon: UserRound },
      { href: '/buyer/addresses', title: 'Addresses', subtitle: 'Delivery & service locations', icon: MapPin },
      { href: '/buyer/profile?tab=documents', title: 'Documents', subtitle: 'Logbooks, insurance & expiry', icon: FolderOpen },
      { href: '/buyer/profile?tab=notifications', title: 'Alerts', subtitle: 'Notifications & preferences', icon: Bell, badgeKey: 'alerts' },
    ],
  },
  {
    title: 'Payments & plans',
    items: [
      { href: '/buyer/profile?tab=billing', title: 'Billing', subtitle: 'Payments & pending totals', icon: CreditCard },
      { href: '/buyer/profile?tab=membership', title: 'Membership', subtitle: 'Plans & subscription', icon: Crown },
      { href: '/buyer/profile?tab=insights', title: 'Insights', subtitle: 'Spend & vehicle health', icon: LineChart },
    ],
  },
  {
    title: 'More',
    items: [
      { href: '/buyer/wishlist', title: 'Wishlist', subtitle: 'Saved parts', icon: Heart },
      { href: '/buyer/profile?tab=services', title: 'Service history', subtitle: 'Requests, ratings & tips', icon: Wrench },
      { href: '/buyer/profile?tab=settings', title: 'Settings', subtitle: 'Service mode, units & theme', icon: SlidersHorizontal },
      { href: '/buyer/support', title: 'Support', subtitle: 'Help & tickets', icon: LifeBuoy },
    ],
  },
];

function resolveCustomerId(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem('currentBuyerId') || '').trim();
}

function localStorageName(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem('currentBuyerName') || '').trim();
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  return (name[0] || 'M').toUpperCase();
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
  const rawName = profile?.customer.name?.trim() || localStorageName();
  const rawEmail = profile?.customer.email || email;
  const phone = profile?.customer.phone?.trim() || '';
  const name = isPlaceholderDisplayName(rawName, { phone, email: rawEmail }) ? 'Buyer' : rawName || 'Buyer';
  const displayEmail = isPlaceholderEmail(rawEmail) ? '' : rawEmail;
  const unread = data?.unreadNotificationCount ?? 0;
  const membership = data?.subscription?.planTier?.trim() || '';

  return (
    <MobileAppPage>
      <MobileAppBar
        title="Profile"
        actions={
          signedIn ? (
            <button
              type="button"
              aria-label="Refresh"
              disabled={loading}
              onClick={() => void load()}
              className="flex h-10 w-10 items-center justify-center text-[#12241C]"
            >
              <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} aria-hidden />
            </button>
          ) : undefined
        }
      />
      <div className="px-4 pb-8 pt-1">
        {signedIn === null || (signedIn && loading && !data) ? (
          <HeroSkeleton />
        ) : signedIn === false ? (
          <GuestCard />
        ) : (
          <>
            {error ? (
              <p className="mb-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-[13px] font-medium text-[#B91C1C]">{error}</p>
            ) : null}

            <section className="relative overflow-hidden rounded-[22px] border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-[#FFF6EA] to-white p-4 shadow-[0_12px_28px_rgba(18,36,28,0.06)]">
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#E8C56B]/30 blur-2xl" aria-hidden />
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E8C56B]" aria-hidden />
                <div className="relative flex items-start gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-lg font-bold text-primary">
                    {initialsFrom(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-bold tracking-tight text-[#12241C]">{name}</p>
                    {phone ? (
                      <p className="mt-0.5 text-[13px] text-[#4A5C54]">{formatE164Display(phone)}</p>
                    ) : (
                      <p className="mt-0.5 text-[13px] text-[#B45309]">Add a phone number</p>
                    )}
                    {displayEmail ? (
                      <p className="truncate text-[12.5px] text-[#7A8B82]">{displayEmail}</p>
                    ) : null}
                    {membership ? (
                      <span className="mt-1.5 inline-flex rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-bold text-[#087A53]">
                        {membership[0]!.toUpperCase()}
                        {membership.slice(1)} plan
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href="/buyer/profile?tab=account"
                    className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-primary ring-1 ring-primary/15"
                  >
                    Edit
                  </Link>
                </div>

                {!phone ? (
                  <Link
                    href="/buyer/profile?tab=account"
                    className="relative mt-3 flex items-center gap-2 rounded-xl bg-[#FEF3C7] px-3 py-2.5"
                  >
                    <span className="flex-1 text-[13px] font-semibold text-[#12241C]">
                      Add your mobile so providers can reach you
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#7A8B82]" aria-hidden />
                  </Link>
                ) : null}

                <div className="relative mt-3.5 grid grid-cols-4 gap-1.5">
                  <Stat href="/buyer/orders" label="Orders" value={`${profile?.customer.totalOrders ?? 0}`} />
                  <Stat href="/buyer/garage" label="Garage" value={`${profile?.stats.vehicles ?? 0}`} />
                  <Stat href="/buyer/wishlist" label="Saved" value={`${profile?.stats.wishlistItems ?? 0}`} />
                  <Stat href="/buyer/profile?tab=insights" label="Spent" value={formatUgxCompact(profile?.customer.totalSpent ?? 0)} />
                </div>
              </section>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {SHORTCUTS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center rounded-2xl border border-border/80 bg-white px-1 py-3 shadow-[0_4px_12px_rgba(18,36,28,0.04)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="mt-1.5 text-center text-[11px] font-semibold text-[#12241C]">{item.label}</span>
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openConciergeChat()}
              className="mt-2.5 flex w-full items-center gap-3 rounded-2xl border border-[#0E9A6A]/20 bg-[#D3F6E6] px-3.5 py-3 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-[#087A53]">Ask Concierge</span>
                <span className="block text-[12px] text-[#4A5C54]">Parts, bookings, and garage help</span>
              </span>
              <ChevronRight className="h-5 w-5 text-[#087A53]" aria-hidden />
            </button>

            {unread > 0 ? (
              <Link
                href="/buyer/profile?tab=notifications"
                className="mt-2.5 flex items-center gap-2 rounded-2xl bg-[#FEF3C7] px-3.5 py-3"
              >
                <Bell className="h-[18px] w-[18px] text-[#B45309]" aria-hidden />
                <span className="flex-1 text-[13px] font-semibold text-[#12241C]">
                  {unread} unread alert{unread === 1 ? '' : 's'}
                </span>
                <ChevronRight className="h-4 w-4 text-[#7A8B82]" aria-hidden />
              </Link>
            ) : null}

            <div className="mt-5 space-y-4">
              {GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A8B82]">
                    {group.title}
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_4px_12px_rgba(18,36,28,0.04)]">
                    {group.items.map((item, index) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3.5 py-3',
                          index > 0 && 'border-t border-[#F0E6D6]',
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <item.icon className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-semibold text-[#12241C]">{item.title}</span>
                          <span className="block text-[12px] text-[#7A8B82]">
                            {item.badgeKey === 'alerts' && unread > 0
                              ? `${unread} unread · preferences`
                              : item.subtitle}
                          </span>
                        </span>
                        {item.badgeKey === 'alerts' && unread > 0 ? (
                          <span className="mr-0.5 rounded-full bg-[#B91C1C] px-2 py-0.5 text-[11px] font-bold text-white">
                            {unread}
                          </span>
                        ) : null}
                        <ChevronRight className="h-5 w-5 text-[#C5B8A4]" aria-hidden />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-[#B91C1C]"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </>
        )}
      </div>
    </MobileAppPage>
  );
}

function GuestCard() {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-[#FFF6EA] to-white p-5 text-[#12241C] shadow-[0_12px_28px_rgba(18,36,28,0.06)]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E8C56B]" aria-hidden />
      <p className="text-[22px] font-bold tracking-tight">Your garage, in one place</p>
      <p className="mt-2 text-[14px] leading-relaxed text-[#7A8B82]">
        Sign in to keep vehicles, orders, documents, and membership together.
      </p>
      <ul className="mt-4 space-y-2 text-[13px] font-medium text-[#4A5C54]">
        <li className="flex items-center gap-2">
          <Car className="h-4 w-4 text-primary" aria-hidden />
          Garage & service history
        </li>
        <li className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" aria-hidden />
          Orders and saved parts
        </li>
        <li className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" aria-hidden />
          Membership and billing
        </li>
      </ul>
      <Link
        href="/auth?role=buyer&next=/buyer/profile"
        className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
      >
        Sign in
      </Link>
      <Link
        href="/buyer/services"
        className="mt-2 flex h-10 w-full items-center justify-center text-sm font-semibold text-primary"
      >
        Continue browsing
      </Link>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="animate-pulse rounded-[22px] border border-border/70 bg-white p-4">
      <div className="flex gap-3">
        <div className="h-14 w-14 rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="h-3 w-28 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

function Stat({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link
      href={href}
      className="min-w-0 rounded-xl border border-black/[0.05] bg-white/80 px-1 py-2 text-center"
    >
      <p className="truncate text-[13px] font-bold text-[#12241C]">{value}</p>
      <p className="mt-0.5 text-[10.5px] font-semibold text-[#7A8B82]">{label}</p>
    </Link>
  );
}

const SECTION_TITLES: Record<string, string> = {
  account: 'Account',
  notifications: 'Alerts',
  billing: 'Billing',
  membership: 'Membership',
  documents: 'Documents',
  services: 'Service history',
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
      <MobileAppBar title={SECTION_TITLES[tab] ?? 'Profile'} backHref="/buyer/profile" />
      <div className="px-3 pb-8 pt-2">{children}</div>
    </MobileAppPage>
  );
}
