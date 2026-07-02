import { useEffect, useRef, useState } from 'react';

import type { GeoPoint } from '@/lib/service-request-phase';

type UseSmoothedGeoPositionOptions = {
  durationMs?: number;
};

export function useSmoothedGeoPosition(
  target: GeoPoint | null,
  { durationMs = 1400 }: UseSmoothedGeoPositionOptions = {},
) {
  const [display, setDisplay] = useState<GeoPoint | null>(target);
  const displayRef = useRef<GeoPoint | null>(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!target) {
      displayRef.current = null;
      setDisplay(null);
      return;
    }

    const from = displayRef.current ?? target;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      const next: GeoPoint = {
        lat: from.lat + (target.lat - from.lat) * eased,
        lng: from.lng + (target.lng - from.lng) * eased,
      };
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [durationMs, target?.lat, target?.lng]);

  return display;
}
