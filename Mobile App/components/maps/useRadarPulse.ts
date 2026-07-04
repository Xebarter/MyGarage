import { useEffect, useState } from 'react';

export type RadarRing = {
  radius: number;
  fillOpacity: number;
  strokeOpacity: number;
};

/** Smooth dual-wave radar like ride-hailing pickup search. */
export function useRadarPulse(enabled = true): RadarRing[] {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setPhase((value) => (value + 0.11) % (Math.PI * 2));
    }, 48);
    return () => clearInterval(id);
  }, [enabled]);

  return [0, 1.05].map((offset) => {
    const wave = (Math.sin(phase + offset) + 1) / 2;
    return {
      radius: 55 + wave * 240,
      fillOpacity: 0.28 * (1 - wave),
      strokeOpacity: 0.55 * (1 - wave * 0.65),
    };
  });
}
