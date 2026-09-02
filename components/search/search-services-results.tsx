import Link from 'next/link';
import { ArrowRight, Wrench } from 'lucide-react';

import type { MatchedCatalogService } from '@/lib/search/match-catalog-services';
import { cleanServiceDisplayTitle } from '@/lib/services-catalog';
import { cn } from '@/lib/utils';

export function SearchServicesResults({
  services,
  className,
  compact = false,
}: {
  services: MatchedCatalogService[];
  className?: string;
  compact?: boolean;
}) {
  if (services.length === 0) return null;

  return (
    <section className={cn(className)} aria-label="Matching services">
      <div className={cn('mb-3 flex items-end justify-between gap-3', compact && 'mb-2.5')}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Services</p>
          <h2
            className={cn(
              'mt-1 font-extrabold tracking-tight text-foreground',
              compact ? 'text-lg' : 'text-xl sm:text-2xl',
            )}
          >
            Bookable services
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {services.length} match{services.length === 1 ? '' : 'es'} from the services desk
          </p>
        </div>
        <Link
          href="/buyer/services"
          className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition hover:gap-2.5 sm:inline-flex"
        >
          All services
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <ul className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        {services.map((service) => (
          <li key={service.id}>
            <Link
              href={`/buyer/services?sc=${encodeURIComponent(service.categoryId)}&ss=${encodeURIComponent(service.name)}&quick=1`}
              className="group flex items-center gap-3 rounded-xl border border-black/[0.07] bg-white px-3.5 py-3 transition hover:border-primary/30 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.28)]"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#DBEAFE]/70 text-[20px]"
                aria-hidden
              >
                {service.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                  {cleanServiceDisplayTitle(service.categoryTitle)}
                </span>
                <span className="mt-0.5 block line-clamp-2 text-sm font-semibold leading-snug text-[#0B1220]">
                  {service.name}
                </span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Wrench className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
