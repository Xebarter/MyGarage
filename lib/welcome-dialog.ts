import type { User } from '@supabase/supabase-js';

import { getAuthGivenName, isRecentlyCreatedAuthUser } from '@/lib/auth-avatar';

export const AUTH_WELCOME_STORAGE_KEY = 'mg.authWelcome';
export const AUTH_WELCOME_OAUTH_PENDING_KEY = 'mg.authWelcomeOAuthPending';
export const AUTH_WELCOME_NEW_ACCOUNT_KEY = 'mg.authWelcomeNewAccount';
export const AUTH_WELCOME_EVENT = 'mg:auth-welcome';
export const AUTH_WELCOME_DURATION_MS = 8000;

export type AuthWelcomePayload = {
  name: string;
  isNewAccount: boolean;
  dashboardPath: string;
  role: string;
};

export function dashboardPathForRole(role: string): string {
  if (role === 'vendor') return '/vendor';
  if (role === 'services') return '/services';
  if (role === 'admin') return '/admin';
  return '/buyer';
}

export function welcomeCopy(payload: AuthWelcomePayload): { title: string; description: string } {
  const name = payload.name.trim();
  const named = name.length > 0;

  if (payload.isNewAccount) {
    return {
      title: named ? `Welcome to MyGarage, ${name}` : 'Welcome to MyGarage',
      description: newAccountDescription(payload.role),
    };
  }

  return {
    title: named ? `Welcome back, ${name}` : 'Welcome back',
    description: returningDescription(payload.role),
  };
}

function newAccountDescription(role: string): string {
  if (role === 'vendor') return 'Your seller account is ready. Head home, or open your dashboard to get started.';
  if (role === 'services') return 'Your service provider account is ready. Head home, or open your dashboard.';
  if (role === 'admin') return 'You are signed in to the admin console.';
  return 'Your account is ready. Head home to shop, or open your dashboard.';
}

function returningDescription(role: string): string {
  if (role === 'vendor') return 'Good to see you again. Continue to your seller dashboard, or head home.';
  if (role === 'services') return 'Good to see you again. Open your services dashboard, or head home.';
  if (role === 'admin') return 'You are signed in to the admin console.';
  return 'Good to see you again. Continue shopping, or open your dashboard.';
}

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

function parsePayload(raw: string | null): AuthWelcomePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthWelcomePayload>;
    if (typeof parsed.dashboardPath !== 'string' || !parsed.dashboardPath.startsWith('/')) return null;
    if (typeof parsed.role !== 'string' || !parsed.role.trim()) return null;
    return {
      name: typeof parsed.name === 'string' ? parsed.name.trim() : '',
      isNewAccount: parsed.isNewAccount === true,
      dashboardPath: parsed.dashboardPath,
      role: parsed.role.trim(),
    };
  } catch {
    return null;
  }
}

export function peekAuthWelcome(): AuthWelcomePayload | null {
  if (!canUseSessionStorage()) return null;
  return parsePayload(sessionStorage.getItem(AUTH_WELCOME_STORAGE_KEY));
}

export function consumeAuthWelcome(): AuthWelcomePayload | null {
  const payload = peekAuthWelcome();
  if (canUseSessionStorage()) sessionStorage.removeItem(AUTH_WELCOME_STORAGE_KEY);
  return payload;
}

export function queueAuthWelcome(payload: AuthWelcomePayload): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(AUTH_WELCOME_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(AUTH_WELCOME_EVENT));
}

export function queueAuthWelcomeForUser(
  user: User | null,
  role: string,
  options?: { isNewAccount?: boolean },
): void {
  queueAuthWelcome({
    name: getAuthGivenName(user),
    isNewAccount: options?.isNewAccount ?? isRecentlyCreatedAuthUser(user),
    dashboardPath: dashboardPathForRole(role),
    role,
  });
}

export function markOAuthWelcomePending(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(AUTH_WELCOME_OAUTH_PENDING_KEY, '1');
}

export function clearOAuthWelcomePending(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(AUTH_WELCOME_OAUTH_PENDING_KEY);
}

export function consumeOAuthWelcomePending(): boolean {
  if (!canUseSessionStorage()) return false;
  const pending = sessionStorage.getItem(AUTH_WELCOME_OAUTH_PENDING_KEY) === '1';
  if (pending) sessionStorage.removeItem(AUTH_WELCOME_OAUTH_PENDING_KEY);
  return pending;
}

export function markWelcomeNewAccount(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(AUTH_WELCOME_NEW_ACCOUNT_KEY, '1');
}

export function consumeWelcomeNewAccount(): boolean {
  if (!canUseSessionStorage()) return false;
  const pending = sessionStorage.getItem(AUTH_WELCOME_NEW_ACCOUNT_KEY) === '1';
  if (pending) sessionStorage.removeItem(AUTH_WELCOME_NEW_ACCOUNT_KEY);
  return pending;
}
