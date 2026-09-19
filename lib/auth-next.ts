const AUTH_NEXT_KEY = 'mygarage.authNext';

export function isSafeAuthNext(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.startsWith('/auth')) return false;
  return true;
}

export function rememberAuthNext(path: string): void {
  if (typeof window === 'undefined' || !isSafeAuthNext(path)) return;
  try {
    localStorage.setItem(AUTH_NEXT_KEY, path);
  } catch {
    /* quota / private mode */
  }
}

export function peekAuthNext(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(AUTH_NEXT_KEY);
    return isSafeAuthNext(value) ? value : null;
  } catch {
    return null;
  }
}

export function consumeAuthNext(): string | null {
  const value = peekAuthNext();
  if (typeof window === 'undefined') return value;
  try {
    localStorage.removeItem(AUTH_NEXT_KEY);
  } catch {
    /* ignore */
  }
  return value;
}
