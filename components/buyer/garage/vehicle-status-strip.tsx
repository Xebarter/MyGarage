'use client';

import { Calendar, Wrench } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { VEHICLE_STATUS_LABELS, type VehicleStatus } from '@/lib/garage';
import { cn } from '@/lib/utils';

import { formatGarageDate, statusBadgeClass } from './utils';

export function VehicleStatusStrip({
  status,
  nextServiceDate,
}: {
  status: VehicleStatus;
  nextServiceDate: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Live status</p>
        <Badge variant="outline" className={cn('mt-2 capitalize', statusBadgeClass(status))}>
          {VEHICLE_STATUS_LABELS[status]}
        </Badge>
        <p className="mt-2 text-[11px] text-muted-foreground">Set by your last service provider</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next recommended service</p>
        <p className="mt-2 flex items-center gap-2 font-bold">
          <Calendar className="h-4 w-4 text-primary" />
          {formatGarageDate(nextServiceDate)}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Wrench className="h-3.5 w-3.5" />
          Notes from completed jobs appear in the service log
        </p>
      </div>
    </div>
  );
}
