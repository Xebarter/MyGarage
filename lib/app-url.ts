/** Canonical site origin for server-side redirects and PAYTOTA callbacks. */
const DEFAULT_PUBLIC_URL = "https://mygarage.ug";

export function getPublicAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return DEFAULT_PUBLIC_URL;
}

function withQueryParams(base: string, extra?: Record<string, string>): string {
  if (!extra) return base;
  const u = new URL(base);
  for (const [k, v] of Object.entries(extra)) {
    if (v) u.searchParams.set(k, v);
  }
  return u.toString();
}

export function getPaytotaSuccessRedirectUrl(extra?: Record<string, string>): string {
  const base =
    process.env.PAYTOTA_SUCCESS_REDIRECT?.trim() || `${getPublicAppBaseUrl()}/payments/success`;
  return withQueryParams(base, extra);
}

export function getPaytotaFailureRedirectUrl(extra?: Record<string, string>): string {
  const base =
    process.env.PAYTOTA_FAILURE_REDIRECT?.trim() || `${getPublicAppBaseUrl()}/payments/failure`;
  return withQueryParams(base, extra);
}

export function getPaytotaCancelRedirectUrl(extra?: Record<string, string>): string {
  const base =
    process.env.PAYTOTA_CANCEL_REDIRECT?.trim() || `${getPublicAppBaseUrl()}/payments/cancel`;
  return withQueryParams(base, extra);
}

/** Full webhook URL for PAYTOTA dashboard (configure manually). */
export function getPaytotaWebhookUrl(): string {
  const path = (process.env.PAYTOTA_WEBHOOK_PATH || "/api/paytota/webhook").trim() || "/api/paytota/webhook";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppBaseUrl()}${normalizedPath}`;
}
