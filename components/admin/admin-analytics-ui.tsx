'use client';

import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const analyticsTabTriggerClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm';

type MetricAccent = 'primary' | 'violet' | 'emerald' | 'amber' | 'sky' | 'indigo' | 'fuchsia' | 'teal';

const metricAccentStyles: Record<
  MetricAccent,
  { card: string; iconWrap: string; label: string }
> = {
  primary: {
    card: 'border-primary/20 bg-gradient-to-br from-primary/[0.06] to-card',
    iconWrap: 'bg-primary/12 text-primary ring-1 ring-primary/20',
    label: 'text-primary',
  },
  violet: {
    card: 'border-violet-500/20 bg-gradient-to-br from-violet-500/[0.07] to-card',
    iconWrap: 'bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/20',
    label: 'text-violet-700 dark:text-violet-300',
  },
  emerald: {
    card: 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-card',
    iconWrap: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20',
    label: 'text-emerald-700 dark:text-emerald-400',
  },
  amber: {
    card: 'border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] to-card',
    iconWrap: 'bg-amber-500/12 text-amber-800 dark:text-amber-400 ring-1 ring-amber-500/20',
    label: 'text-amber-800 dark:text-amber-400',
  },
  sky: {
    card: 'border-sky-500/20 bg-gradient-to-br from-sky-500/[0.07] to-card',
    iconWrap: 'bg-sky-500/12 text-sky-800 dark:text-sky-300 ring-1 ring-sky-500/20',
    label: 'text-sky-800 dark:text-sky-300',
  },
  indigo: {
    card: 'border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.07] to-card',
    iconWrap: 'bg-indigo-500/12 text-indigo-800 dark:text-indigo-300 ring-1 ring-indigo-500/20',
    label: 'text-indigo-800 dark:text-indigo-300',
  },
  fuchsia: {
    card: 'border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/[0.07] to-card',
    iconWrap: 'bg-fuchsia-500/12 text-fuchsia-800 dark:text-fuchsia-300 ring-1 ring-fuchsia-500/20',
    label: 'text-fuchsia-800 dark:text-fuchsia-300',
  },
  teal: {
    card: 'border-teal-500/20 bg-gradient-to-br from-teal-500/[0.07] to-card',
    iconWrap: 'bg-teal-500/12 text-teal-800 dark:text-teal-300 ring-1 ring-teal-500/20',
    label: 'text-teal-800 dark:text-teal-300',
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
  /** Custom trend row (e.g. with arrows) */
  trendNode?: ReactNode;
}) {
  const tones = metricAccentStyles[accent];
  const up = trend && trend.pct >= 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06] transition-shadow hover:shadow-md sm:p-5',
        tones.card,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn('text-[10px] font-bold uppercase tracking-widest', tones.label)}>{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
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
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {sub ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{sub}</p> : null}
      {trendNode}
      {!trendNode && trend ? (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
            up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
          )}
        >
          {up ? '↑' : '↓'} {Math.abs(trend.pct).toFixed(1)}% {trend.label}
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
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
        className,
      )}
    >
      <div className="border-b border-border/60 bg-muted/25 px-5 py-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className={cn('p-5 sm:p-6', contentClassName)}>{children}</div>
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-6 px-4 py-4 md:px-8 md:py-6">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-6 md:p-8">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="mt-4 h-8 w-56 max-w-full rounded-lg bg-muted/90" />
        <div className="mt-3 h-4 max-w-md rounded bg-muted/70" />
        <div className="mt-6 flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-muted" />
          <div className="h-9 w-28 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="h-24 rounded-2xl border border-border/50 bg-muted/30" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-24 shrink-0 rounded-lg bg-muted/50" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl border border-border/50 bg-muted/35" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-2xl border border-border/50 bg-muted/30" />
        <div className="h-80 rounded-2xl border border-border/50 bg-muted/30" />
      </div>
    </div>
  );
}
