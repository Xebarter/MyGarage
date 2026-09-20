'use client';

import Link from 'next/link';
import { Loader2, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ServiceRequestExpiredDialogProps = {
  open: boolean;
  service: string;
  location: string;
  category?: string | null;
  vehicleLabel?: string | null;
  restarting?: boolean;
  error?: string | null;
  onRequestAgain: () => void;
};

export function ServiceRequestExpiredDialog({
  open,
  service,
  location,
  vehicleLabel,
  restarting,
  error,
  onRequestAgain,
}: ServiceRequestExpiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className={cn(
          'fixed inset-0 top-0 left-0 z-[80] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none',
          'translate-x-0 translate-y-0 items-center justify-center gap-0 overflow-hidden rounded-none border-0',
          'bg-[#12241C]/45 p-4 shadow-none backdrop-blur-[8px]',
        )}
      >
        <div className="w-full max-w-[20.5rem] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[1.25rem] border border-white/15 bg-background px-4 py-4 shadow-[0_22px_50px_rgba(18,36,28,0.28)] sm:px-5 sm:py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Timed out</p>
          <DialogTitle className="mt-1 text-left text-xl font-semibold tracking-tight text-foreground">
            No provider found
          </DialogTitle>
          <DialogDescription className="sr-only">
            The search ended without a match. Request again to keep looking.
          </DialogDescription>

          <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{service}</p>
            {location ? (
              <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="line-clamp-1">{location}</span>
              </p>
            ) : null}
            {vehicleLabel ? (
              <p className="mt-0.5 truncate pl-5 text-[11px] text-muted-foreground">{vehicleLabel}</p>
            ) : null}
          </div>

          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

          <div className="mt-4 flex flex-col gap-1">
            <Button
              type="button"
              className="h-10 w-full rounded-xl font-semibold"
              disabled={restarting}
              onClick={onRequestAgain}
            >
              {restarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching
                </>
              ) : (
                'Request again'
              )}
            </Button>
            <Button type="button" variant="ghost" className="h-9 w-full rounded-xl text-sm text-muted-foreground" asChild>
              <Link href="/buyer/services">Not now</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
