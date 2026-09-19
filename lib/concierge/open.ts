export const CONCIERGE_OPEN_EVENT = "concierge:open";
export const CONCIERGE_STORAGE_KEY = "conciergeChat";

export type ConciergeOpenDetail = {
  vehicleId?: string;
};

export function openConciergeChat(detail: ConciergeOpenDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONCIERGE_OPEN_EVENT, { detail }));
}

const CONFIRM_RE =
  /^(yes|yep|yeah|ok|okay|sure|confirm|book it|book them|add them|add it|do it|go ahead|please book|please add)[\s!.]*$/i;

export function isConciergeConfirmPhrase(value: string): boolean {
  return CONFIRM_RE.test(value.trim());
}

export function shouldHideConcierge(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/vendor")) return true;
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return true;
  if (pathname === "/services" || pathname.startsWith("/services/")) return true;
  return false;
}
