/** Detect names that were auto-filled from phone/email instead of a real person name. */

const GENERIC_NAMES = new Set(["customer", "buyer", "user", "there", "guest"]);

export function isPlaceholderDisplayName(
  name: string | null | undefined,
  options?: { phone?: string | null; email?: string | null },
): boolean {
  const n = (name ?? "").trim();
  if (!n) return true;
  const lower = n.toLowerCase();
  if (GENERIC_NAMES.has(lower)) return true;
  if (/\(\s*(buyer|vendor|service provider|admin)\s*\)\s*$/i.test(n)) return true;
  if (lower.startsWith("phone.")) return true;

  const nameDigits = n.replace(/\D/g, "");
  if (nameDigits.length >= 9 && /^\+?[\d\s\-()]+$/.test(n)) return true;

  const phoneDigits = (options?.phone ?? "").replace(/\D/g, "");
  if (phoneDigits.length >= 9 && nameDigits === phoneDigits) return true;

  const email = (options?.email ?? "").trim().toLowerCase();
  const local = email.split("@")[0] ?? "";
  if (local && n === local && (email.startsWith("phone.") || email.endsWith("@users.mygarage.app"))) {
    return true;
  }
  return false;
}

export function firstGivenName(fullName: string): string {
  const first = fullName.trim().split(/\s+/).filter(Boolean)[0];
  return first ?? "";
}
