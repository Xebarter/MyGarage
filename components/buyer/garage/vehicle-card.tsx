'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BUYER_SURFACE } from '@/components/buyer/buyer-page-chrome';
import { VEHICLE_STATUS_LABELS } from '@/lib/garage';
import { cn } from '@/lib/utils';

import type { BuyerGarageVehicle } from './types';
import { GarageVehiclePhoto } from './vehicle-photo';
import { formatGarageDate, statusBadgeClass, vehicleImageSrc, vehicleSubtitle, vehicleTitle } from './utils';

export function GarageVehicleCard({ vehicle }: { vehicle: BuyerGarageVehicle }) {
  const photo = vehicleImageSrc(vehicle);
  const title = vehicleTitle(vehicle);

  return (
    <Link href={`/buyer/garage/${encodeURIComponent(vehicle.id)}`} className="block">
      <Card className={cn(BUYER_SURFACE, 'h-full overflow-hidden transition hover:border-primary/30 hover:shadow-md')}>
        <div className="relative aspect-[16/10] w-full bg-muted">
          <GarageVehiclePhoto src={photo} alt={title} iconClassName="h-10 w-10" />
        </div>
        <div className="p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-bold tracking-tight">{title}</p>
            {vehicle.isPrimary ? (
              <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-label="Primary" />
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{vehicleSubtitle(vehicle)}</p>
          <Badge variant="outline" className={cn('mt-2 capitalize', statusBadgeClass(vehicle.vehicleStatus))}>
            {VEHICLE_STATUS_LABELS[vehicle.vehicleStatus]}
          </Badge>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Next service {formatGarageDate(vehicle.nextServiceDate)}
            {vehicle.lastService?.serviceDate
              ? ` · Last visit ${formatGarageDate(vehicle.lastService.serviceDate)}`
              : ''}
          </p>
        </div>
      </Card>
    </Link>
  );
}
