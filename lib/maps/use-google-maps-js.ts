'use client';

import { useJsApiLoader } from '@react-google-maps/api';

const LOADER = {
  id: 'mygarage-google-maps',
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  language: 'en',
  region: 'UG',
} as const;

/** Loads the Maps JavaScript API once for all trip maps on the page. */
export function useGoogleMapsJs() {
  return useJsApiLoader(LOADER);
}

export function hasGoogleMapsBrowserKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
}

/** Resolves the real Map constructor (required by the dynamic Maps JS loader). */
export async function importGoogleMapsLib(): Promise<typeof google.maps> {
  await google.maps.importLibrary('maps');
  return google.maps;
}
