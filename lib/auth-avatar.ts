import type { User } from '@supabase/supabase-js';

export {
  isAdminEmailAllowlisted,
  metadataGrantsAdmin,
  userHasAdminAccess,
  userHasAdminPortalAccess,
} from '@/lib/auth-admin-shared';

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

function titleCaseWord(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 3 && trimmed === trimmed.toUpperCase()) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/** First name for greetings, from OAuth metadata or the email local-part. */
export function getAuthGivenName(user: User | null): string {
  if (!user) return '';
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const given = pickString(meta?.given_name);
  if (given) return titleCaseWord(given.split(/\s+/)[0] ?? given);

  const fullName = pickString(meta?.full_name, meta?.name, meta?.display_name);
  if (fullName) {
    const first = fullName.split(/\s+/).filter(Boolean)[0];
    if (first) return titleCaseWord(first);
  }

  const email = user.email?.trim();
  if (email) {
    const local = email.split('@')[0] ?? '';
    const token = local.split(/[._+\-]/).filter(Boolean)[0] ?? local;
    if (token) return titleCaseWord(token);
  }

  return '';
}

export function isRecentlyCreatedAuthUser(
  user: { created_at?: string } | null,
  windowMs = 10 * 60 * 1000,
): boolean {
  if (!user?.created_at) return false;
  const created = Date.parse(user.created_at);
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= windowMs;
}
