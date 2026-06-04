'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const authFieldClassName =
  'w-full min-h-11 rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-base text-foreground shadow-sm transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:text-sm';

export const authPrimaryButtonClassName =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60';

export const authCardClassName =
  'w-full max-w-[min(100vw-1.5rem,28rem)] overflow-hidden rounded-2xl border-border/80 bg-card shadow-lg ring-1 ring-black/[0.04] dark:ring-white/[0.06]';

export function AuthPageBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-muted/40 via-background to-background px-3 py-8 sm:px-4 sm:py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent"
        aria-hidden
      />
      <div className="relative w-full max-w-[min(100vw-1.5rem,28rem)]">{children}</div>
    </div>
  );
}

export function AuthBrandBanner() {
  return (
    <Link
      href="/"
      className="flex items-center justify-center gap-2.5 rounded-xl py-1 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
        <Image src="/icon0.svg" alt="" width={32} height={32} className="h-8 w-8 object-contain" priority />
      </span>
      <span className="text-left">
        <span className="block text-lg font-bold tracking-tight text-foreground">MyGarage</span>
        <span className="block text-[11px] font-medium text-muted-foreground">Parts & services</span>
      </span>
    </Link>
  );
}

export function AuthRoleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
      {label}
    </span>
  );
}

export function AuthFormHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <div className="space-y-2 text-center">
      {badge ? (
        <div>
          <AuthRoleBadge label={badge} />
        </div>
      ) : null}
      <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
      {description ? <p className="text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p> : null}
    </div>
  );
}

export function AuthMessage({
  variant,
  children,
}: {
  variant: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        'rounded-xl px-3 py-2.5 text-sm leading-snug',
        variant === 'error' && 'bg-destructive/10 text-destructive',
        variant === 'success' && 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
        variant === 'info' && 'border border-border/70 bg-muted/30 text-muted-foreground',
      )}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t border-border/70" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

export function AuthCardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4 text-xs sm:text-sm', className)}>
      {children}
    </div>
  );
}

export function getAuthRoleMeta(role: string): { title: string; description: string; badge: string } {
  switch (role) {
    case 'admin':
      return {
        badge: 'Admin',
        title: 'Admin sign in',
        description: 'Approved admin accounts only.',
      };
    case 'vendor':
      return {
        badge: 'Vendor',
        title: 'Sign in',
        description: 'Products, orders, and payouts.',
      };
    case 'services':
      return {
        badge: 'Services',
        title: 'Sign in',
        description: 'Jobs, customers, and funds.',
      };
    default:
      return {
        badge: 'Buyer',
        title: 'Sign in',
        description: 'Shop and book services. Phone added if needed.',
      };
  }
}
