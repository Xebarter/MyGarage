'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { buyerNeedsDisplayName, saveBuyerDisplayName } from '@/lib/auth/save-display-name';
import { firstGivenName } from '@/lib/display-name';
import { queueAuthWelcomeForUser } from '@/lib/welcome-dialog';

function shouldSkip(pathname: string): boolean {
  if (pathname === '/auth' || pathname.startsWith('/auth/')) return true;
  if (pathname.startsWith('/vendor') || pathname.startsWith('/admin')) return true;
  if (pathname === '/services' || pathname.startsWith('/services/')) return true;
  return false;
}

export function CollectDisplayNameHost() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const probing = useRef(false);

  const probe = useCallback(async () => {
    if (shouldSkip(pathname) || probing.current) return;
    probing.current = true;
    try {
      const { needed } = await buyerNeedsDisplayName();
      if (needed) {
        setOpen(true);
      }
    } catch {
      /* ignore */
    } finally {
      probing.current = false;
    }
  }, [pathname]);

  useEffect(() => {
    void probe();
    const t = window.setTimeout(() => void probe(), 800);
    return () => window.clearTimeout(t);
  }, [probe]);

  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void probe();
      else setOpen(false);
    });
    return () => data.subscription.unsubscribe();
  }, [probe]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await saveBuyerDisplayName(name);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        queueAuthWelcomeForUser(
          {
            ...user,
            user_metadata: {
              ...user.user_metadata,
              full_name: saved.name,
              name: saved.name,
              given_name: firstGivenName(saved.name),
            },
          },
          'buyer',
          { isNewAccount: true },
        );
      }
      setOpen(false);
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your name.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) return;
        setOpen(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="rounded-2xl sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight">What’s your name?</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            We’ll show this on your profile and when we welcome you back.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Input
            autoFocus
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="h-11 rounded-xl"
          />
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={busy}>
            {busy ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
