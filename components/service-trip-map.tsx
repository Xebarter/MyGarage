'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { ServiceTripMapInnerProps } from '@/components/service-trip-map-inner';

const Inner = dynamic(() => import('@/components/service-trip-map-inner').then((m) => m.ServiceTripMapInner), {
  ssr: false,
  loading: () => <Skeleton className="h-[min(48vh,420px)] w-full rounded-2xl" />,
});

export type TripMapPoint = { lat: number; lng: number };

export type ServiceTripMapProps = {
  destination: TripMapPoint | null;
  provider: TripMapPoint | null;
  className?: string;
  providerLabel?: string;
  destinationLabel?: string;
  /** Geocode this address when destination coords are missing */
  destinationAddress?: string;
  /** searching = radar at pickup; tracking = route + both markers */
  mode?: 'tracking' | 'searching' | 'auto';
  minHeight?: string;
};

export function ServiceTripMap({
  minHeight = 'min(48vh,420px)',
  ...props
}: ServiceTripMapProps) {
  return <Inner {...props} minHeight={minHeight} />;
}

export type { ServiceTripMapInnerProps };
