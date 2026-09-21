'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { isPlaceholderDisplayName } from '@/lib/display-name';
import { formatUgxCompact } from '@/lib/format-ugx';
import { formatE164Display, isPlaceholderEmail } from '@/lib/phone';

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  return (name[0] || 'M').toUpperCase();
}

function formatMemberSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `Member since ${date.toLocaleDateString('en-UG', { month: 'short', year: 'numeric' })}`;
}

type Props = {
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  wishlistItems: number;
  vehicles: number;
  membership?: string | null;
  onEdit: () => void;
};

export function ProfileHero({
  name,
  email,
  phone,
  createdAt,
  totalOrders,
  totalSpent,
  wishlistItems,
  vehicles,
  membership,
  onEdit,
}: Props) {
  const displayName = isPlaceholderDisplayName(name, { phone, email }) ? 'Buyer' : name.trim() || 'Buyer';
  const displayEmail = isPlaceholderEmail(email) ? '' : email.trim();
  const phoneLabel = phone.trim() ? formatE164Display(phone) : '';
  const since = formatMemberSince(createdAt);
  const plan = membership?.trim() || '';

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-[#FFF6EA] to-card px-5 pb-5 pt-5 text-foreground md:px-7">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#E8C56B]/30 blur-2xl" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E8C56B]" aria-hidden />

      <div className="relative flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-primary/25 bg-primary/10 text-xl font-extrabold text-primary">
          {initials(displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[22px] font-extrabold tracking-tight text-[#12241C]">{displayName}</p>
          {phoneLabel ? (
            <p className="mt-0.5 text-[13.5px] text-[#4A5C54]">{phoneLabel}</p>
          ) : (
            <p className="mt-0.5 text-[13.5px] text-[#B45309]">Add a phone number</p>
          )}
          {displayEmail ? <p className="truncate text-[13px] text-[#7A8B82]">{displayEmail}</p> : null}
          {since ? <p className="mt-0.5 text-xs text-[#7A8B82]">{since}</p> : null}
          {plan ? (
            <span className="mt-2 inline-flex rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-bold text-[#087A53]">
              {plan[0]!.toUpperCase()}
              {plan.slice(1)} plan
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-semibold text-primary ring-1 ring-primary/15"
        >
          Edit
        </button>
      </div>

      {!phoneLabel ? (
        <button
          type="button"
          onClick={onEdit}
          className="relative mt-4 flex w-full items-center gap-2 rounded-xl bg-[#FEF3C7] px-3.5 py-2.5 text-left"
        >
          <span className="flex-1 text-[13px] font-semibold text-[#12241C]">
            Add your mobile so providers can reach you
          </span>
          <ChevronRight className="h-4 w-4 text-[#7A8B82]" aria-hidden />
        </button>
      ) : null}

      <div className="relative mt-4 grid grid-cols-4 gap-2">
        <HeroStat href="/buyer/orders" label="Orders" value={String(totalOrders)} />
        <HeroStat href="/buyer/garage" label="Garage" value={String(vehicles)} />
        <HeroStat href="/buyer/wishlist" label="Saved" value={String(wishlistItems)} />
        <HeroStat href="/buyer/profile?tab=insights" label="Spent" value={formatUgxCompact(totalSpent)} />
      </div>
    </section>
  );
}

function HeroStat({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link
      href={href}
      className="min-w-0 rounded-xl border border-black/[0.05] bg-white/80 px-2 py-2.5 text-center transition-colors hover:bg-white"
    >
      <p className="truncate text-[15px] font-extrabold leading-tight text-[#12241C]">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-[#7A8B82]">{label}</p>
    </Link>
  );
}
