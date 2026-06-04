/** Central SEO / canonical URL configuration for MyGarage. */

export const SITE_NAME = 'MyGarage';

export const SITE_TAGLINE = 'Car parts & automotive services in Uganda';

export const DEFAULT_TITLE = `${SITE_NAME} — Car Parts, Accessories & Services in Uganda`;

export const DEFAULT_DESCRIPTION =
  'Shop genuine and aftermarket car parts, fluids, and accessories with fitment support. Book roadside help, repairs, and maintenance services across Uganda. Secure checkout and reliable delivery.';

export const SITE_LOCALE = 'en_UG';

export const DEFAULT_OG_IMAGE_PATH = '/web-app-manifest-512x512.png';

/** Primary keywords for default metadata (avoid stuffing on every page). */
export const SITE_KEYWORDS = [
  'car parts Uganda',
  'auto parts Kampala',
  'automotive accessories',
  'car spares Uganda',
  'vehicle parts online',
  'roadside assistance Uganda',
  'mobile mechanic Kampala',
  'car service booking',
  'MyGarage',
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
