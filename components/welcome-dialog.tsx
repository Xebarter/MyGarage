'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home, LayoutDashboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AUTH_WELCOME_DURATION_MS,
  AUTH_WELCOME_EVENT,
  consumeAuthWelcome,
  peekAuthWelcome,
  welcomeCopy,
  type AuthWelcomePayload,
} from '@/lib/welcome-dialog';

function shouldSuppressWelcome(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/');
}

export function WelcomeDialogHost() {
  const pathname = usePathname();
  const router = useRouter();
  const [payload, setPayload] = useState<AuthWelcomePayload | null>(null);
  const [open, setOpen] = useState(false);
  const [progressOn, setProgressOn] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;

  const copy = useMemo(() => (payload ? welcomeCopy(payload) : null), [payload]);

  const dismiss = useCallback(() => {
    consumeAuthWelcome();
    setOpen(false);
    setProgressOn(false);
    setPayload(null);
  }, []);

  const tryShow = useCallback(() => {
    if (shouldSuppressWelcome(pathname) || openRef.current) return;
    const next = peekAuthWelcome();
    if (!next) return;
    setPayload(next);
    setOpen(true);
    setProgressOn(false);
  }, [pathname]);

  useEffect(() => {
    tryShow();
  }, [tryShow]);

  useEffect(() => {
    const onQueued = () => tryShow();
    window.addEventListener(AUTH_WELCOME_EVENT, onQueued);
    return () => window.removeEventListener(AUTH_WELCOME_EVENT, onQueued);
  }, [tryShow]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => setProgressOn(true));
    const timer = window.setTimeout(() => dismiss(), AUTH_WELCOME_DURATION_MS);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [open, dismiss]);

  const goTo = (href: string) => {
    dismiss();
    if (pathname === href) return;
    router.push(href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden rounded-2xl p-0 sm:max-w-md"
        onPointerDownOutside={() => dismiss()}
        onEscapeKeyDown={() => dismiss()}
      >
        <DialogHeader className="space-y-3 px-6 pb-1 pt-7 text-center sm:text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
            <Image src="/icon0.svg" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          </div>
          <DialogTitle className="text-pretty text-xl font-bold tracking-tight">
            {copy?.title ?? 'Welcome'}
          </DialogTitle>
          <DialogDescription className="text-pretty text-sm leading-relaxed">
            {copy?.description ?? ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2.5 px-6 pb-6 pt-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => goTo('/')}>
            <Home className="h-4 w-4" aria-hidden />
            Home
          </Button>
          <Button
            type="button"
            className="h-11 rounded-xl"
            onClick={() => goTo(payload?.dashboardPath || '/buyer')}
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Dashboard
          </Button>
        </div>
        <div className="h-1 bg-muted" aria-hidden>
          <div
            className="h-full bg-primary transition-all ease-linear"
            style={{
              width: progressOn ? '0%' : '100%',
              transitionDuration: progressOn ? `${AUTH_WELCOME_DURATION_MS}ms` : '0ms',
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
