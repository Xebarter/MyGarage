'use client';

import Image from 'next/image';
import { Car, Heart, ShoppingBag, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { serviceCardSurfaceClass, serviceCardTone } from '@/lib/service-card-tones';

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

function formatMemberSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Member';
  return `Member since ${date.toLocaleDateString('en-UG', { month: 'short', year: 'numeric' })}`;
}

type Props = {
  name: string;
  email: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: string;
  wishlistItems: number;
  serviceRequests: number;
};

export function ProfileHero({
  name,
  email,
  createdAt,
  totalOrders,
  totalSpent,
  wishlistItems,
  serviceRequests,
}: Props) {
  const firstName = name.trim().split(/\s+/)[0] ?? 'there';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.14] via-[#FFF6EA] to-card px-4 pb-6 pt-4 text-foreground md:px-8 md:pb-8">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#E8C56B]/30 blur-2xl" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E8C56B]" aria-hidden />

      <div className="relative flex items-center gap-2.5">
        <Image src="/icon0.svg" alt="" width={36} height={36} className="h-9 w-9 object-contain" />
        <p className="text-[15px] font-extrabold tracking-tight text-[#12241C]">MyGarage</p>
      </div>

      <div className="relative mt-5 flex items-center gap-3.5">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-primary/25 bg-primary/10 text-xl font-extrabold text-primary">
          {initials(name || email)}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#7A8B82]">Hello, {firstName}</p>
          <p className="truncate text-[22px] font-extrabold tracking-tight text-[#12241C]">{name || email}</p>
          <p className="mt-0.5 text-xs text-[#7A8B82]">{formatMemberSince(createdAt)}</p>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <HeroStat icon={ShoppingBag} label="Orders" value={String(totalOrders)} tone={0} />
        <HeroStat icon={Wallet} label="Spent" value={totalSpent} tone={1} />
        <HeroStat icon={Heart} label="Wishlist" value={String(wishlistItems)} tone={2} />
        <HeroStat icon={Car} label="Services" value={String(serviceRequests)} tone={3} />
      </div>
    </section>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  tone: number;
}) {
  return (
    <div
      className={cn('flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2', serviceCardSurfaceClass)}
      style={{ backgroundColor: serviceCardTone(tone) }}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/60 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-extrabold leading-tight text-[#12241C]">{value}</p>
        <p className="text-[11px] font-semibold text-[#7A8B82]">{label}</p>
      </div>
    </div>
  );
}
