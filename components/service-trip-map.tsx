'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { TripMapPoint } from '@/components/service-trip-map-inner';

const Inner = dynamic(() => import('@/components/service-trip-map-inner').then((m) => m.ServiceTripMapInner), {
  ssr: false,
  loading: () => <Skeleton className="h-[min(45vh,380px)] w-full rounded-2xl" />,
});

export type { TripMapPoint };

export function ServiceTripMap(props: {
  destination: TripMapPoint | null;
  provider: TripMapPoint | null;
  className?: string;
  providerLabel?: string;
  destinationLabel?: string;
}) {
  return <Inner {...props} />;
}
