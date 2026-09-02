'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bolt } from 'lucide-react';

import {
  cleanServiceDisplayTitle,
  userServiceCategories,
  type UserServiceCategory,
} from '@/lib/services-catalog';
import { serviceCardSurfaceClass, serviceCardTone, SERVICE_EMERGENCY_TONE, serviceEmergencySurfaceClass } from '@/lib/service-card-tones';
import { cn } from '@/lib/utils';

type ActiveRequestSummary = {
  id: string;
  service: string;
  statusLabel: string;
};

export function MobileBuyerServicesBrowse({
  onSelectService,
  activeRequest,
}: {
  onSelectService: (categoryTitle: string, serviceName: string) => void;
  activeRequest?: ActiveRequestSummary | null;
}) {
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const selected = useMemo(
    () => (categoryId ? userServiceCategories.find((c) => c.id === categoryId) ?? null : null),
    [categoryId],
  );

  if (selected) {
    return (
      <MobileCategoryDetail
        category={selected}
        onBack={() => setCategoryId(null)}
        onPickService={(serviceName) => onSelectService(selected.title, serviceName)}
      />
    );
  }

  const urgent = userServiceCategories.filter((c) => c.priority === 'urgent');
  const rest = userServiceCategories.filter((c) => c.priority !== 'urgent');

  return (
    <div className="min-h-full bg-[#F2F4F8] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="px-5 pb-2 pt-4">
        <div className="flex items-center justify-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1220] text-[11px] font-extrabold tracking-tight text-white"
            aria-hidden
          >
            MG
          </span>
          <h1 className="text-[26px] font-bold tracking-tight text-[#0B1220]">Services</h1>
        </div>
        <p className="mt-2 text-center text-[14px] leading-relaxed text-[#8B9BB0]">
          Get help now or book the right repair when you need it.
        </p>
      </header>

      {activeRequest ? (
        <div className="px-4 pt-3">
          <Link
            href={`/buyer/services/track/${activeRequest.id}`}
            className={cn(
              'flex items-center justify-between gap-3 rounded-[14px] px-4 py-3.5',
              serviceCardSurfaceClass,
            )}
            style={{ backgroundColor: serviceCardTone(3) }}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1E4ED8]">
                Active request
              </p>
              <p className="mt-1 truncate text-[15px] font-semibold text-[#0B1220]">
                {activeRequest.service}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-[#475569]">{activeRequest.statusLabel}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-[#1E4ED8]" aria-hidden />
          </Link>
        </div>
      ) : null}

      {urgent.length > 0 ? (
        <div className="space-y-2.5 px-4 pt-3">
          {urgent.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={cn(
                'w-full rounded-[22px] p-[18px] text-left transition active:scale-[0.99]',
                serviceEmergencySurfaceClass,
              )}
              style={{ backgroundColor: SERVICE_EMERGENCY_TONE }}
            >
              <div className="flex items-start gap-3.5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-white/45 text-[28px]">
                  {category.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full bg-[#9F2A2A]/12 px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#9F2A2A]">
                    Priority
                  </span>
                  <p className="mt-2 text-[19px] font-bold leading-snug tracking-tight text-[#0B1220]">
                    {cleanServiceDisplayTitle(category.title)}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[#9F2A2A]/80" aria-hidden />
              </div>
              <p className="mt-3.5 text-[14px] leading-relaxed text-[#5C3A38]">{category.useWhen}</p>
              <p className="mt-3.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#9F2A2A]">
                <Bolt className="h-4 w-4" aria-hidden />
                {category.services.length} emergency options · fastest response
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <>
          <p
            className={cn(
              'px-5 text-[13px] font-semibold tracking-wide text-[#8B9BB0]',
              urgent.length > 0 ? 'pb-2.5 pt-3' : 'pb-2.5 pt-2',
            )}
          >
            {urgent.length > 0 ? 'All services' : 'Browse services'}
          </p>
          <div className="grid grid-cols-2 gap-2.5 px-4 pb-10">
            {rest.map((category, index) => {
              const muted = category.priority === 'optional';
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={cn(
                    'flex h-[112px] flex-col rounded-[14px] p-3 text-left transition active:scale-[0.99]',
                    serviceCardSurfaceClass,
                  )}
                  style={{ backgroundColor: serviceCardTone(index) }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/50 text-[20px]"
                    aria-hidden
                  >
                    {category.emoji}
                  </span>
                  <span className="mt-auto line-clamp-2 text-[13px] font-semibold leading-snug text-[#0B1220]">
                    <span className={muted ? 'text-[#475569]' : undefined}>
                      {cleanServiceDisplayTitle(category.title)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MobileCategoryDetail({
  category,
  onBack,
  onPickService,
}: {
  category: UserServiceCategory;
  onBack: () => void;
  onPickService: (serviceName: string) => void;
}) {
  const urgent = category.priority === 'urgent';
  const title = cleanServiceDisplayTitle(category.title);

  return (
    <div className="min-h-full bg-[#F2F4F8] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="px-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0B1220] shadow-sm"
          aria-label="Back to services"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col items-center px-6 pb-3 pt-2">
        <span
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full border text-[34px] shadow-[0_8px_20px_-2px_rgba(11,18,32,0.05)]"
          style={{
            backgroundColor: urgent ? SERVICE_EMERGENCY_TONE : serviceCardTone(1),
            borderColor: urgent ? 'rgba(159,42,42,0.2)' : 'rgba(0,0,0,0.06)',
          }}
          aria-hidden
        >
          {category.emoji}
        </span>
        {urgent ? (
          <span className="mt-4 rounded-full bg-[#9F2A2A]/12 px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#9F2A2A]">
            Priority
          </span>
        ) : null}
        <h2
          className={cn(
            'text-center text-[22px] font-bold leading-snug tracking-tight text-[#0B1220]',
            urgent ? 'mt-2.5' : 'mt-4',
          )}
        >
          {title}
        </h2>
        <p className="mt-2 text-center text-[13px] font-semibold text-[#8B9BB0]">
          {category.services.length === 1 ? '1 service' : `${category.services.length} services`}
        </p>
      </div>

      <p className="px-4 pb-2 text-center text-[13px] font-semibold tracking-wide text-[#8B9BB0]">
        Choose a service
      </p>

      <ul className="space-y-2 px-4 pb-10">
        {category.services.map((service, index) => {
          const priceLabel =
            service.defaultPriceUgx > 0
              ? `From UGX ${Math.round(service.defaultPriceUgx).toLocaleString('en-UG')}`
              : 'Quote on request';
          const tone = serviceCardTone(index);
          return (
            <li key={service.name}>
              <button
                type="button"
                onClick={() => onPickService(service.name)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-[14px] px-3.5 py-3.5 text-left transition active:scale-[0.99]',
                  serviceCardSurfaceClass,
                )}
                style={{ backgroundColor: tone }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug text-[#0B1220]">
                    {service.name}
                  </span>
                  <span className="mt-1.5 block text-[13px] font-bold text-[#0B1220]/70">
                    {priceLabel}
                  </span>
                </span>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/55 text-[#0B1220]"
                  aria-hidden
                >
                  <ArrowRight className="h-[18px] w-[18px]" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
