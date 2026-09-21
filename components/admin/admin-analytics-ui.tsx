'use client';

import type { ComponentType, ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const analyticsTabTriggerClass =
  'relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium text-muted-foreground shadow-none transition-all hover:bg-background/70 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgba(24,40,28,0.08),0_8px_20px_rgba(24,40,28,0.06)] data-[state=active]:ring-1 data-[state=active]:ring-black/[0.04] dark:data-[state=active]:ring-white/10';

export const analyticsIntroClass =
  'flex min-w-0 flex-1 gap-4 rounded-2xl border border-border/60 bg-card/90 p-5 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset,0_12px_40px_rgba(24,40,28,0.05)] ring-1 ring-black/[0.03] dark:bg-card/80 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] dark:ring-white/[0.05]';

export const analyticsStatTileClass =
  'rounded-2xl border border-border/70 bg-card/90 p-4 shadow-[0_8px_24px_rgba(24,40,28,0.04)] ring-1 ring-black/[0.03] dark:ring-white/[0.05]';

export const ANALYTICS_CHART_COLORS = [
  'oklch(0.6 0.14 162)',
  'oklch(0.78 0.12 82)',
  'oklch(0.45 0.06 155)',
  'oklch(0.68 0.11 200)',
  'oklch(0.62 0.12 45)',
  'oklch(0.55 0.04 155)',
  'oklch(0.7 0.14 25)',
];

type MetricAccent = 'primary' | 'violet' | 'emerald' | 'amber' | 'sky' | 'indigo' | 'fuchsia' | 'teal';

const metricAccentStyles: Record<
  MetricAccent,
  { bar: string; iconWrap: string; label: string }
> = {
  primary: {
    bar: 'from-primary via-accent to-primary/40',
    iconWrap: 'bg-primary/10 text-primary ring-1 ring-primary/15',
    label: 'text-muted-foreground',
  },
  violet: {
    bar: 'from-violet-500/80 via-primary/50 to-transparent',
    iconWrap: 'bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/15 dark:text-violet-300',
    label: 'text-muted-foreground',
  },
  emerald: {
    bar: 'from-emerald-600 via-primary to-transparent',
    iconWrap: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-400',
    label: 'text-muted-foreground',
  },
  amber: {
    bar: 'from-accent via-amber-400/80 to-transparent',
    iconWrap: 'bg-accent/40 text-amber-800 ring-1 ring-accent/50 dark:text-amber-300',
    label: 'text-muted-foreground',
  },
  sky: {
    bar: 'from-sky-600/80 via-primary/40 to-transparent',
    iconWrap: 'bg-sky-500/10 text-sky-800 ring-1 ring-sky-500/15 dark:text-sky-300',
    label: 'text-muted-foreground',
  },
  indigo: {
    bar: 'from-indigo-500/80 via-primary/40 to-transparent',
    iconWrap: 'bg-indigo-500/10 text-indigo-800 ring-1 ring-indigo-500/15 dark:text-indigo-300',
    label: 'text-muted-foreground',
  },
  fuchsia: {
    bar: 'from-fuchsia-500/70 via-primary/40 to-transparent',
    iconWrap: 'bg-fuchsia-500/10 text-fuchsia-800 ring-1 ring-fuchsia-500/15 dark:text-fuchsia-300',
    label: 'text-muted-foreground',
  },
  teal: {
    bar: 'from-teal-600 via-primary to-transparent',
    iconWrap: 'bg-teal-500/10 text-teal-800 ring-1 ring-teal-500/15 dark:text-teal-300',
    label: 'text-muted-foreground',
  },
};

export function AnalyticsMetricCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  accent = 'primary',
  className,
  trendNode,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { pct: number; label: string };
  icon?: ComponentType<{ className?: string }>;
  accent?: MetricAccent;
  className?: string;
  trendNode?: ReactNode;
}) {
  const tones = metricAccentStyles[accent];
  const up = trend && trend.pct >= 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_10px_28px_rgba(24,40,28,0.05)] ring-1 ring-black/[0.03] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(24,40,28,0.08)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.22)] dark:ring-white/[0.05] dark:hover:shadow-[0_18px_44px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r', tones.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em]', tones.label)}>{label}</p>
          <p className="mt-2.5 font-semibold tabular-nums tracking-tight text-foreground text-[1.7rem] leading-none sm:text-[1.85rem]">
            {value}
          </p>
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              tones.iconWrap,
            )}
            aria-hidden
          >
            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </span>
        ) : null}
      </div>
      {sub ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{sub}</p> : null}
      {trendNode}
      {!trendNode && trend ? (
        <p
          className={cn(
            'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            up
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
          )}
        >
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(trend.pct).toFixed(1)}% {trend.label}
        </p>
      ) : null}
    </div>
  );
}

export function AnalyticsSectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_0_rgba(255,255,255,0.65)_inset,0_12px_36px_rgba(24,40,28,0.045)] ring-1 ring-black/[0.03] dark:shadow-[0_14px_36px_rgba(0,0,0,0.22)] dark:ring-white/[0.05]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/50 bg-gradient-to-b from-muted/35 to-transparent px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('p-5 sm:p-6', contentClassName)}>{children}</div>
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="relative mx-auto max-w-[1600px] animate-pulse px-4 py-6 md:px-8 md:py-8">
      <div className="overflow-hidden rounded-[1.6rem] border border-border/60 bg-card/80 p-6 shadow-sm md:p-8">
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="mt-4 h-9 w-72 max-w-full rounded-lg bg-muted/90" />
        <div className="mt-3 h-4 max-w-lg rounded bg-muted/70" />
        <div className="mt-6 flex gap-2">
          <div className="h-9 w-24 rounded-full bg-muted" />
          <div className="h-9 w-28 rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-5 h-[4.5rem] rounded-2xl border border-border/50 bg-card/70" />
      <div className="mt-5 flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 w-[5.5rem] shrink-0 rounded-full bg-muted/60" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl border border-border/50 bg-card" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-2xl border border-border/50 bg-card" />
        <div className="h-80 rounded-2xl border border-border/50 bg-card" />
      </div>
    </div>
  );
}
