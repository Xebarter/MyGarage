import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function HomeSectionHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel = 'See all',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground lg:text-[2.15rem] lg:leading-tight">
          {title}
        </h2>
        {description ? (
          <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition hover:gap-2.5"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
