'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, RefreshCw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPlaceholderEmail } from '@/lib/phone';

type PortalPendingScreenProps = {
  /** Short label, e.g. "Supplier" or "Services" */
  portalLabel: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  accent: 'amber' | 'violet';
  authRole: 'vendor' | 'services';
  /** Where to go once approved */
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
  },
  violet: {
    border: 'border-violet-500/25',
    ring: 'ring-violet-500/15',
    gradient: 'from-violet-500/10',
    iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    badge: 'border-violet-500/40 bg-violet-500/10 text-violet-950 dark:text-violet-100',
  },
} as const;

type VendorFlags = {
  vendorVerified?: boolean;
  servicesVerified?: boolean;
};

export function PortalPendingScreen({
  portalLabel,
  icon: Icon,
  accent,
  authRole,
  authNext,
  onSignOutCleanup,
}: PortalPendingScreenProps) {
  const router = useRouter();
  const supabase = createClient();
  const theme = ACCENT[accent];
  const checkingRef = useRef(false);

  const [accountLabel, setAccountLabel] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const approved = useCallback(
    (flags: VendorFlags | null) => {
      if (!flags) return false;
      return authRole === 'services'
        ? flags.servicesVerified === true
        : flags.vendorVerified === true;
    },
    [authRole],
  );

  const fetchStatus = useCallback(
    async (uid: string, opts?: { quiet?: boolean }) => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      if (!opts?.quiet) {
        setChecking(true);
        setMessage(null);
      }
      try {
        const res = await fetch(`/api/vendors/${encodeURIComponent(uid)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!opts?.quiet) {
            setMessage(
              res.status === 404
                ? 'Account not found yet. Try again shortly.'
                : 'Could not check status.',
            );
          }
          return;
        }
        const flags = (await res.json()) as VendorFlags;
        if (approved(flags)) {
          setMessage('Approved — opening dashboard…');
          router.replace(authNext);
          return;
        }
        if (!opts?.quiet) setMessage('Still pending.');
      } catch {
        if (!opts?.quiet) setMessage('Could not check status.');
      } finally {
        checkingRef.current = false;
        setChecking(false);
      }
    },
    [approved, authNext, router],
  );

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const email = (user.email ?? '').trim();
      const phone = String(user.phone ?? user.user_metadata?.phone ?? '').trim();
      setAccountLabel(
        email && !isPlaceholderEmail(email) ? email : phone || email || '',
      );
      setLoading(false);
    })();
  }, [supabase.auth]);

  useEffect(() => {
    if (!userId) return;
    void fetchStatus(userId, { quiet: true });
    const timer = window.setInterval(() => {
      void fetchStatus(userId, { quiet: true });
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [fetchStatus, userId]);

  const handleSignOut = async () => {
    onSignOutCleanup();
    await supabase.auth.signOut();
    window.location.href = `/auth?role=${authRole}&next=${encodeURIComponent(authNext)}`;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-sm p-6" aria-busy="true">
        <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4 py-10">
      <div
        className={cn(
          'w-full max-w-sm rounded-2xl border bg-gradient-to-br via-card to-card p-5 shadow-sm ring-1 sm:p-6',
          theme.border,
          theme.ring,
          theme.gradient,
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', theme.iconBg)}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                theme.badge,
              )}
            >
              Pending
            </span>
            <h1 className="mt-2 text-xl font-bold tracking-tight">Waiting for approval</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {portalLabel} access needs an admin OK.
            </p>
          </div>
        </div>

        {accountLabel ? (
          <p className="mt-4 truncate rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm font-medium">
            {accountLabel}
          </p>
        ) : null}

        <Button
          type="button"
          className="mt-5 h-11 w-full rounded-xl"
          disabled={checking || !userId}
          onClick={() => void fetchStatus(userId)}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', checking && 'animate-spin')} aria-hidden />
          {checking ? 'Checking…' : 'Check status'}
        </Button>

        {message ? (
          <p
            className={cn(
              'mt-3 text-center text-sm',
              message.startsWith('Approved') ? 'font-medium text-primary' : 'text-muted-foreground',
            )}
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-center gap-3 text-xs text-muted-foreground">
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
