/** Uganda-first E.164 helpers. Accepts 07xx, 7xx, 256…, or a full +country number. */

const PLACEHOLDER_HOST = "users.mygarage.app";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeToE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = digitsOnly(trimmed);

  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  if (digits.startsWith("256") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+256${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith("7")) {
    return `+256${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export function phoneLookupVariants(raw: string): string[] {
  const e164 = normalizeToE164(raw);
  const digits = digitsOnly(e164 ?? raw);
  const variants = new Set<string>();
  if (e164) variants.add(e164);
  if (digits) variants.add(digits);
  if (digits.startsWith("256") && digits.length === 12) {
    variants.add(`+${digits}`);
    variants.add(`0${digits.slice(3)}`);
    variants.add(digits.slice(3));
    variants.add(`+256 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`);
    variants.add(`0${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`);
  }
  if (digits.length === 9 && digits.startsWith("7")) {
    variants.add(`+256${digits}`);
    variants.add(`0${digits}`);
    variants.add(`256${digits}`);
  }
  return [...variants].filter(Boolean);
}

export function placeholderEmailForPhone(phone: string): string {
  const e164 = normalizeToE164(phone) ?? phone;
  const digits = digitsOnly(e164);
  return `phone.${digits || "unknown"}@${PLACEHOLDER_HOST}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  const value = (email ?? "").trim().toLowerCase();
  return value.startsWith("phone.") && value.endsWith(`@${PLACEHOLDER_HOST}`);
}

export function formatE164Display(phone: string): string {
  const e164 = normalizeToE164(phone);
  if (!e164) return phone.trim();
  if (e164.startsWith("+256") && e164.length === 13) {
    return `+256 ${e164.slice(4, 7)} ${e164.slice(7, 10)} ${e164.slice(10)}`;
  }
  return e164;
}
