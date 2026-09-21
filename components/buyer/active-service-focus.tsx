'use client';

import Link from 'next/link';
import { Loader2, MapPin, Radio } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { serviceCardSurfaceClass, serviceCardTone } from '@/lib/service-card-tones';
import { cn } from '@/lib/utils';

export type ActiveServiceFocusRequest = {
  id: string;
  service: string;
  location?: string | null;
  status: 'pending' | 'matched' | 'in_progress' | string;
};

function statusCopy(status: string): { label: string; detail: string; badgeClass: string } {
  if (status === 'in_progress') {
    return {
      label: 'In progress',
      detail: 'Your provider is working this request. This is the only live service until it finishes.',
      badgeClass: 'border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100',
    };
  }
  if (status === 'matched') {
    return {
      label: 'Accepted',
      detail: 'A provider accepted. Opening live tracking for this request.',
      badgeClass: 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100',
    };
  }
  return {
    label: 'Finding a provider',
    detail: 'We’re matching nearby help. This request stays live until someone accepts or the search expires.',
    badgeClass: 'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100',
  };
}

export function ActiveServiceFocus({
  request,
  href,
}: {
  request: ActiveServiceFocusRequest;
  href: string;
}) {
  const copy = statusCopy(request.status);
  const searching = request.status === 'pending';

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-background via-background to-muted/25 px-4 py-6 sm:px-6 md:p-8">
      <div className="mx-auto flex max-w-lg flex-col gap-5">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Your service</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
            {request.service || 'Live request'}
          </h1>
        </div>

        <div
          className={cn('rounded-2xl px-5 py-6', serviceCardSurfaceClass)}
          style={{ backgroundColor: serviceCardTone(0) }}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {searching ? <Radio className="h-5 w-5 animate-pulse" aria-hidden /> : <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <Badge variant="outline" className={cn('h-6 px-2 text-[10px] font-semibold', copy.badgeClass)}>
                {copy.label}
              </Badge>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.detail}</p>
              {request.location ? (
                <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{request.location}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <Link
          href={href}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-md"
        >
          {searching ? 'Open live search' : 'Open live tracking'}
        </Link>
        <p className="text-center text-xs text-muted-foreground">
          Only one service can run at a time. Browse again after this request finishes or expires.
        </p>
      </div>
    </div>
  );
}
