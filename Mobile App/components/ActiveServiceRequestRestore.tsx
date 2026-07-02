import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchBuyerServiceRequestDetail } from '@/lib/api';
import {
  clearActiveServiceRequestId,
  getActiveServiceRequestId,
  isTerminalServiceRequestStatus,
} from '@/lib/service-request-storage';

export function ActiveServiceRequestRestore() {
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, loading } = useAuth();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (loading || !user || !profile?.customer.id || restoredRef.current) return;

    const path = segments.join('/');
    if (
      path.includes('service/track') ||
      path.includes('service/complete-pending') ||
      path.includes('(auth)/login')
    ) {
      return;
    }

    void (async () => {
      const activeId = await getActiveServiceRequestId();
      if (!activeId) return;

      try {
        const detail = await fetchBuyerServiceRequestDetail(activeId, profile.customer.id);
        if (isTerminalServiceRequestStatus(detail.request.status)) {
          await clearActiveServiceRequestId();
          return;
        }
        restoredRef.current = true;
        router.replace(`/service/track/${activeId}`);
      } catch {
        await clearActiveServiceRequestId();
      }
    })();
  }, [loading, profile?.customer.id, router, segments, user]);

  return null;
}
