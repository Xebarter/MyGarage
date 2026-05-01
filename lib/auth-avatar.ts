import type { User } from '@supabase/supabase-js';

/** Matches auth page gating: users who may open the admin dashboard. */
export function userHasAdminPortalAccess(user: User): boolean {
  const appRole = String(user.app_metadata?.role ?? '').toLowerCase();
  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? (user.app_metadata.roles as unknown[]).map((entry) => String(entry).toLowerCase())
    : [];
  return appRole === 'admin' || appRoles.includes('admin');
}

function pickString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim();
      if (t) return t;
    }
  }
  return null;
}

/** Avatar URL from OAuth / user metadata (Google, GitHub, etc.). */
export function getAuthAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta = pickString(meta?.avatar_url, meta?.picture, meta?.image);
  if (fromMeta) return fromMeta;

  for (const identity of user.identities ?? []) {
    const data = identity?.identity_data as Record<string, unknown> | undefined;
    if (!data) continue;
    const fromId = pickString(data.avatar_url, data.picture, data.image);
    if (fromId) return fromId;
  }
  return null;
}

/** Short initials for avatar fallback (never empty when user is non-null). */
export function getAuthDisplayInitials(user: User | null): string {
  if (!user) return '';
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = pickString(meta?.full_name, meta?.name, meta?.display_name);
  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]?.[0];
      const b = parts[parts.length - 1]?.[0];
      if (a && b) return (a + b).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  }
  const email = user.email?.trim();
  if (email) return email.slice(0, 2).toUpperCase();

  const phone = pickString(meta?.phone);
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 2) return digits.slice(-2);
    if (digits.length === 1) return `${digits}${digits}`;
  }

  return '?';
}
