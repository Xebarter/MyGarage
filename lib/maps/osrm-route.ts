export type LngLat = { lng: number; lat: number };

/** Driving route via public OSRM demo (no API key). Returns GeoJSON LineString coordinates [lng,lat][]. */
export async function fetchOsrmRoute(from: LngLat, to: LngLat): Promise<number[][] | null> {
  const a = `${from.lng},${from.lat}`;
  const b = `${to.lng},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${a};${b}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      code?: string;
      routes?: { geometry?: { coordinates?: number[][] } }[];
    };
    if (json.code !== 'Ok' || !json.routes?.[0]?.geometry?.coordinates) return null;
    return json.routes[0].geometry.coordinates;
  } catch {
    return null;
  }
}
