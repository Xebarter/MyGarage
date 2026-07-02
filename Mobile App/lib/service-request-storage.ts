import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = 'mygarage_pending_service_request_v1';
const ACTIVE_KEY = 'mygarage_active_service_request_v1';

export type PendingServiceRequest = {
  categoryId: string;
  category: string;
  service: string;
  location: string;
  destinationLat?: number;
  destinationLng?: number;
  savedAt: string;
};

export async function savePendingServiceRequest(payload: Omit<PendingServiceRequest, 'savedAt'>): Promise<void> {
  const data: PendingServiceRequest = {
    ...payload,
    savedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(data));
}

export async function readPendingServiceRequest(): Promise<PendingServiceRequest | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingServiceRequest>;
    if (
      typeof parsed.categoryId !== 'string' ||
      typeof parsed.category !== 'string' ||
      typeof parsed.service !== 'string' ||
      typeof parsed.location !== 'string'
    ) {
      return null;
    }
    if (!parsed.categoryId.trim() || !parsed.category.trim() || !parsed.service.trim() || !parsed.location.trim()) {
      return null;
    }
    return {
      categoryId: parsed.categoryId.trim(),
      category: parsed.category.trim(),
      service: parsed.service.trim(),
      location: parsed.location.trim(),
      destinationLat:
        parsed.destinationLat != null && Number.isFinite(Number(parsed.destinationLat))
          ? Number(parsed.destinationLat)
          : undefined,
      destinationLng:
        parsed.destinationLng != null && Number.isFinite(Number(parsed.destinationLng))
          ? Number(parsed.destinationLng)
          : undefined,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function clearPendingServiceRequest(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export async function getActiveServiceRequestId(): Promise<string | null> {
  const id = await AsyncStorage.getItem(ACTIVE_KEY);
  return id?.trim() ? id.trim() : null;
}

export async function setActiveServiceRequestId(requestId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, requestId.trim());
}

export async function clearActiveServiceRequestId(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_KEY);
}

export function isTerminalServiceRequestStatus(status: string): boolean {
  return status === 'completed' || status === 'cancelled';
}
