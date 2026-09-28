/** Central SEO / canonical URL configuration for MyGarage. */

export const SITE_NAME = 'MyGarage';

export const SITE_TAGLINE = 'Car parts, mechanics, garages & roadside assistance in Uganda';

export const DEFAULT_TITLE = `${SITE_NAME} Uganda — Car Parts, Mechanics, Garages & Roadside Assistance`;

export const DEFAULT_DESCRIPTION =
  'MyGarage Uganda is the automotive platform for car spare parts, mechanics, garages, car servicing, and roadside assistance in Kampala and across Uganda. Shop OEM and aftermarket parts, book repair or a mobile mechanic, and keep digital service history.';

export const SITE_LOCALE = 'en_UG';

export const DEFAULT_OG_IMAGE_PATH = '/web-app-manifest-512x512.png';

/** Primary keywords for default metadata (avoid stuffing on every page). */
export const SITE_KEYWORDS = [
  'MyGarage Uganda',
  'car spare parts Uganda',
  'car repair Uganda',
  'mechanic Kampala',
  'car garage Kampala',
  'car servicing Uganda',
  'roadside assistance Kampala',
  'auto parts Kampala',
  'OEM part number',
  'mobile mechanic Kampala',
] as const;

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/+$/, '')}`;
  }
  return 'http://localhost:3000';
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function absoluteImageUrl(path: string | null | undefined): string | undefined {
  if (!path?.trim()) return undefined;
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return absoluteUrl(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
}
