import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchBuyerServiceRequestDetail } from '@/lib/api';
import { getServiceRequestUiPhase, isTrackingPhase } from '@/lib/service-request-phase';
import { subscribeToBuyerServiceRequest } from '@/lib/service-request-realtime';
import {
  clearActiveServiceRequestId,
  getActiveServiceRequestId,
  isTerminalServiceRequestStatus,
} from '@/lib/service-request-storage';
import { getSupabase } from '@/lib/supabase';

/**
 * Keeps buyers on the live tracking screen when a provider accepts while they are elsewhere in the app.
 */
export function ServiceRequestLiveNavigation() {
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, loading } = useAuth();
  const navigatingRef = useRef(false);
  const lastProviderIdRef = useRef<string | null>(null);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  useEffect(() => {
    if (loading || !user || !profile?.customer.id) return;

    const path = segments.join('/');
    const onTrackScreen = path.includes('service/track');
    const onAuth = path.includes('(auth)/login');
    const onPending = path.includes('service/complete-pending');

    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const activeId = await getActiveServiceRequestId();
      if (!activeId || onAuth || onPending) return;

      try {
        const detail = await fetchBuyerServiceRequestDetail(activeId, profile.customer.id);
        if (isTerminalServiceRequestStatus(detail.request.status)) {
          await clearActiveServiceRequestId();
          return;
        }

        const phase = getServiceRequestUiPhase(detail.request);
        lastProviderIdRef.current = detail.request.providerId;

        if (!onTrackScreen && isTrackingPhase(phase)) {
          navigatingRef.current = true;
          router.replace(`/service/track/${activeId}`);
        }

        const supabase = getSupabase();
        if (!supabase) return;

        unsubscribe = subscribeToBuyerServiceRequest(supabase, activeId, (row) => {
          const providerId = row.provider_id == null ? null : String(row.provider_id);
          const status = row.status == null ? '' : String(row.status);
          const acceptedAt = row.accepted_at == null ? null : String(row.accepted_at);
          const wasUnassigned = !lastProviderIdRef.current;
          const nowAssigned = Boolean(providerId || acceptedAt || status === 'matched');

          if (wasUnassigned && nowAssigned) {
            lastProviderIdRef.current = providerId;
            const currentPath = segmentsRef.current.join('/');
            if (!currentPath.includes('service/track') && !navigatingRef.current) {
              navigatingRef.current = true;
              router.replace(`/service/track/${activeId}`);
            }
          } else if (providerId) {
            lastProviderIdRef.current = providerId;
          }

          if (status === 'completed' || status === 'cancelled') {
            void clearActiveServiceRequestId();
          }
        });
      } catch {
        await clearActiveServiceRequestId();
      }
    })();

    return () => {
      navigatingRef.current = false;
      unsubscribe?.();
    };
  }, [loading, profile?.customer.id, router, segments, user]);

  return null;
}
