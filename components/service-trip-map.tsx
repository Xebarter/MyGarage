'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { MapPoint } from '@/lib/maps/ride-map-utils';

export type TripMapPoint = MapPoint;

export type ServiceTripMapInnerProps = {
  destination: TripMapPoint | null;
  provider: TripMapPoint | null;
  className?: string;
  providerLabel?: string;
  destinationLabel?: string;
  destinationAddress?: string;
  mode?: 'tracking' | 'searching' | 'auto';
  minHeight?: string;
  onRouteMeta?: (meta: {
    distanceMeters: number | null;
    durationSeconds: number | null;
    etaMinutes: number | null;
  } | null) => void;
};

const Inner = dynamic(() => import('@/components/service-trip-map-inner'), {
  ssr: false,
  loading: () => <Skeleton className="h-[min(48vh,420px)] w-full rounded-2xl" />,
});

export type ServiceTripMapProps = ServiceTripMapInnerProps;

export function ServiceTripMap({
  minHeight = 'min(48vh,420px)',
  ...props
}: ServiceTripMapProps) {
  return <Inner {...props} minHeight={minHeight} />;
}
