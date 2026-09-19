'use client';

import type { ReactNode } from 'react';
import {
  CheckCircle2,
  Clock3,
  Package,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export const BUYER_PAGE_MAX = 'mx-auto w-full max-w-6xl';

export const BUYER_SURFACE =
  'gap-0 overflow-hidden rounded-2xl border-border/70 bg-card py-0 shadow-[0_10px_30px_rgba(11,18,32,0.05)] ring-1 ring-black/[0.03]';

export function BuyerPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'min-h-full bg-gradient-to-b from-background via-background to-muted/30 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-10 sm:pt-6 md:p-8 md:pb-12',
        className,
      )}
    >
      <div className={cn(BUYER_PAGE_MAX, 'space-y-6')}>{children}</div>
    </div>
  );
}

export function BuyerPageHeader({
  eyebrow = 'Account',
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-[2rem]">{title}</h1>
        {description ? (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function BuyerEmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center sm:py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function BuyerStatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_8px_24px_rgba(11,18,32,0.04)] ring-1 ring-black/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-xl font-extrabold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function BuyerSectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function BuyerFilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition',
        active
          ? 'border-[#0B1220] bg-[#0B1220] text-white shadow-sm'
          : 'border-border/80 bg-background text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground',
      )}
    >
      {children}
      {typeof count === 'number' ? (
        <span
          className={cn(
            'rounded-full px-1.5 py-px text-[10px] font-bold',
            active ? 'bg-white/15 text-white' : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export type OrderStatus =
  | 'pending'
  | 'pending_fulfillment'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export function orderStatusPresentation(status: string): {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'pending':
    case 'pending_fulfillment':
      return {
        label: 'Paid',
        icon: Clock3,
        badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-950',
        dotClass: 'bg-amber-500',
      };
    case 'processing':
      return {
        label: 'Processing',
        icon: Clock3,
        badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-950',
        dotClass: 'bg-sky-500',
      };
    case 'shipped':
      return {
        label: 'In transit',
        icon: Truck,
        badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-950',
        dotClass: 'bg-violet-500',
      };
    case 'delivered':
      return {
        label: 'Delivered',
        icon: CheckCircle2,
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950',
        dotClass: 'bg-emerald-500',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: Package,
        badgeClass: 'border-border bg-muted text-muted-foreground',
        dotClass: 'bg-muted-foreground',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        icon: Package,
        badgeClass: 'border-border bg-muted text-muted-foreground',
        dotClass: 'bg-muted-foreground',
      };
    default:
      return {
        label: status,
        icon: ShoppingBag,
        badgeClass: 'border-border bg-muted text-muted-foreground',
        dotClass: 'bg-muted-foreground',
      };
  }
}

export function ticketStatusClass(status: string): string {
  switch (status) {
    case 'resolved':
    case 'closed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950';
    case 'in_progress':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-950';
    default:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-950';
  }
}

export function ticketPriorityClass(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'border-red-500/30 bg-red-500/10 text-red-950';
    case 'high':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-950';
    case 'low':
      return 'border-border bg-muted text-muted-foreground';
    default:
      return 'border-primary/25 bg-primary/10 text-primary';
  }
}

export function formatOrderWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatUgxCompact(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  if (rounded >= 1_000_000) {
    const m = rounded / 1_000_000;
    return `UGX ${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (rounded >= 10_000) return `UGX ${Math.round(rounded / 1_000)}K`;
  return `UGX ${rounded.toLocaleString('en-UG')}`;
}

export function BuyerPageSkeleton({ tiles = 4, rows = 3 }: { tiles?: number; rows?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-20 animate-pulse rounded-2xl bg-muted/60" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: tiles }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
