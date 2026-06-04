'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, Clock3, Store, ShoppingBag, LogOut, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = { id: string; label: string; done?: boolean; active?: boolean };

type PortalPendingScreenProps = {
  portalLabel: string;
  icon: ComponentType<{ className?: string }>;
  accent: 'amber' | 'violet';
  steps: Step[];
  authRole: 'vendor' | 'services';
  authNext: string;
  onSignOutCleanup: () => void;
};

const ACCENT = {
  amber: {
    border: 'border-amber-500/25',
    ring: 'ring-amber-500/15',
    gradient: 'from-amber-500/10',
    iconBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100',
    activeStep: 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  violet: {
    border: 'border-violet-500/25',
    ring: 'ring-violet-500/15',
    gradient: 'from-violet-500/10',
    iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    badge: 'border-violet-500/40 bg-violet-500/10 text-violet-950 dark:text-violet-100',
    activeStep: 'border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-400',
  },
} as const;

function getInitials(email: string, fallback: string): string {
  const local = email.split('@')[0]?.trim() ?? '';
  return (local.slice(0, 2) || fallback).toUpperCase();
}

export function PortalPendingScreen({
  portalLabel,
  icon: Icon,
  accent,
  steps,
  authRole,
  authNext,
  onSignOutCleanup,
}: PortalPendingScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const theme = ACCENT[accent];
  const supabase = createClient();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setEmail((data.user?.email ?? '').trim());
      setLoading(false);
    });
  }, []);

  const initials = useMemo(() => getInitials(email, accent === 'amber' ? 'VN' : 'SP'), [email, accent]);

  const handleSignOut = async () => {
    onSignOutCleanup();
    await supabase.auth.signOut();
    window.location.href = `/auth?role=${authRole}&next=${encodeURIComponent(authNext)}`;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-3 sm:p-5 md:p-8" aria-busy="true">
        <div className="h-28 animate-pulse rounded-xl bg-muted/50" />
        <div className="h-14 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background px-3 pb-6 pt-2 sm:px-5 sm:pt-3 md:p-8">
      <div className="mx-auto max-w-md space-y-3 sm:space-y-4">
        <section
          className={cn(
            'rounded-xl border bg-gradient-to-br via-card to-card p-4 shadow-sm ring-1 sm:p-5',
            theme.border,
            theme.ring,
            theme.gradient,
          )}
        >
          <div className="flex gap-3">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', theme.iconBg)}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <Badge variant="outline" className={cn('mb-1.5 text-[10px] font-semibold uppercase', theme.badge)}>
                Pending
              </Badge>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">Awaiting approval</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">{portalLabel} · admin review</p>
            </div>
          </div>

          {email ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/80 px-2.5 py-2">
              <Avatar className="h-8 w-8 shrink-0 border border-border/80">
                <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <p className="min-w-0 truncate text-sm font-medium text-foreground">{email}</p>
            </div>
          ) : null}

          <ol className="mt-4 flex items-center justify-between gap-1" aria-label="Verification progress">
            {steps.map((step) => (
              <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border',
                    step.done
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : step.active
                        ? theme.activeStep
                        : 'border-border bg-muted/40 text-muted-foreground',
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  ) : step.active ? (
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Circle className="h-3 w-3" aria-hidden />
                  )}
                </span>
                <span
                  className={cn(
                    'w-full truncate px-0.5 text-[10px] font-medium sm:text-xs',
                    step.done || step.active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-10 rounded-lg text-sm">
            <Link href="/">
              <Store className="mr-1.5 h-4 w-4" aria-hidden />
              Shop
            </Link>
          </Button>
          <Button asChild className="h-10 rounded-lg text-sm">
            <Link href="/buyer">
              <ShoppingBag className="mr-1.5 h-4 w-4" aria-hidden />
              Buyer
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <Link href="/contact-us" className="font-medium text-primary hover:underline">
            Support
          </Link>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-1 font-medium hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
