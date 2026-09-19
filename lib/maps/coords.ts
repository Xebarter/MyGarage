export type MapPoint = { lat: number; lng: number };

/** Reject missing, out-of-range, and Null Island (0,0) coordinates. */
export function parseMapPoint(lat: unknown, lng: unknown): MapPoint | null {
  const la = typeof lat === "number" ? lat : Number(lat);
  const ln = typeof lng === "number" ? lng : Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  if (Math.abs(la) < 1e-4 && Math.abs(ln) < 1e-4) return null;
  return { lat: la, lng: ln };
}
