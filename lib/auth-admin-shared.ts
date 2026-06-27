import type { User } from '@supabase/supabase-js';

/** Comma-separated admin emails in env (e.g. ADMIN_EMAILS=you@example.com). */
export function parseAdminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmailAllowlisted(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return parseAdminEmailAllowlist().has(email.trim().toLowerCase());
}

export function metadataGrantsAdmin(appMetadata: Record<string, unknown> | undefined | null): boolean {
  const appRole = String(appMetadata?.role ?? '').toLowerCase();
  const appRoles = Array.isArray(appMetadata?.roles)
    ? (appMetadata.roles as unknown[]).map((entry) => String(entry).toLowerCase())
    : [];
  return appRole === 'admin' || appRoles.includes('admin');
}

/** Client-safe check using the current session user (JWT + optional email allowlist). */
export function userHasAdminAccess(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isAdminEmailAllowlisted(user.email)) return true;
  return metadataGrantsAdmin(user.app_metadata as Record<string, unknown>);
}

/** @deprecated Use userHasAdminAccess */
export const userHasAdminPortalAccess = userHasAdminAccess;
