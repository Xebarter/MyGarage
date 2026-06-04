import { getSiteUrl } from '@/lib/seo/site';

/** Paths and patterns that must not be indexed. */
export const DISALLOW_PATHS = [
  '/api/',
  '/admin/',
  '/auth/',
  '/buyer-dashboard/',
  '/vendor/',
  '/services/',
  '/buyer/',
  '/cart',
  '/checkout',
  '/order-confirmation',
  '/payments/',
];

/** Explicit allow overrides (e.g. public page under a disallowed prefix). */
export const ALLOW_PATHS = ['/buyer/services', '/buyer/services/'];

export function robotsHost(): string {
  return getSiteUrl().replace(/^https?:\/\//, '');
}
