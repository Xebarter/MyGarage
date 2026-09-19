'use client';

import { useEffect, useState } from 'react';
import { Car } from 'lucide-react';

import { cn } from '@/lib/utils';

import { vehicleImageSrc } from './utils';

export function GarageVehiclePhoto({
  src,
  alt,
  className,
  iconClassName,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  iconClassName?: string;
}) {
  const url = vehicleImageSrc(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!url || failed) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center bg-[#0B1220]/8', className)}>
        <Car className={cn('h-8 w-8 text-muted-foreground', iconClassName)} aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded garage photos from storage
    <img src={url} alt={alt} className={cn('h-full w-full object-cover', className)} onError={() => setFailed(true)} />
  );
}
