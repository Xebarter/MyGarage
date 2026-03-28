/** Session draft for a service request submitted by a guest before buyer auth + phone. */

export const PENDING_BUYER_SERVICE_REQUEST_KEY = 'pendingBuyerServiceRequest';

export type PendingBuyerServiceRequest = {
  category: string;
  service: string;
  location: string;
  savedAt: string;
};

export function savePendingBuyerServiceRequest(payload: { category: string; service: string; location: string }): void {
  if (typeof window === 'undefined') return;
  const data: PendingBuyerServiceRequest = { ...payload, savedAt: new Date().toISOString() };
  sessionStorage.setItem(PENDING_BUYER_SERVICE_REQUEST_KEY, JSON.stringify(data));
}

export function readPendingBuyerServiceRequest(): PendingBuyerServiceRequest | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_BUYER_SERVICE_REQUEST_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PendingBuyerServiceRequest>;
    if (typeof p.category !== 'string' || typeof p.service !== 'string' || typeof p.location !== 'string') return null;
    if (!p.category.trim() || !p.service.trim() || !p.location.trim()) return null;
    return {
      category: p.category.trim(),
      service: p.service.trim(),
      location: p.location.trim(),
      savedAt: typeof p.savedAt === 'string' ? p.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearPendingBuyerServiceRequest(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_BUYER_SERVICE_REQUEST_KEY);
}

/** Where to send the user after auth + phone so the draft request is created and they land on tracking. */
export const BUYER_SERVICE_COMPLETE_PENDING_PATH = '/buyer/services/complete-pending';
