'use client';

import Image from 'next/image';
import { Car, Heart, ShoppingBag, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <section className="relative overflow-hidden rounded-b-[28px] bg-[#0B1220] px-4 pb-6 pt-4 text-slate-50 md:px-8 md:pb-8">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-blue-500" />
      <div className="flex items-center gap-2.5">
        <Image src="/icon0.svg" alt="" width={36} height={36} className="h-9 w-9 object-contain brightness-0 invert" />
        <p className="text-[15px] font-extrabold tracking-tight">MyGarage</p>
      </div>

      <div className="mt-5 flex items-center gap-3.5">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-blue-500/45 bg-white/6 text-xl font-extrabold text-blue-300">
          {initials(name || email)}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-400">Hello, {firstName}</p>
          <p className="truncate text-[22px] font-extrabold tracking-tight">{name || email}</p>
          <p className="mt-0.5 text-xs text-slate-400">{formatMemberSince(createdAt)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <HeroStat icon={ShoppingBag} label="Orders" value={String(totalOrders)} />
        <HeroStat icon={Wallet} label="Spent" value={totalSpent} />
        <HeroStat icon={Heart} label="Wishlist" value={String(wishlistItems)} />
        <HeroStat icon={Car} label="Services" value={String(serviceRequests)} />
      </div>
    </section>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/12 bg-white/6 px-2.5 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
        <Icon className="h-3.5 w-3.5 text-blue-300" />
      </div>
      <div className="min-w-0">
        <p className={cn('truncate text-[15px] font-extrabold leading-tight')}>{value}</p>
        <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      </div>
    </div>
  );
}
