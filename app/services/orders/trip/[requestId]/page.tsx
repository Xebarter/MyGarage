'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceTripMap, type TripMapPoint } from '@/components/service-trip-map';
import { createClient } from '@/lib/supabase/client';
import { mergeRealtimeRowIntoTripRequest, subscribeToBuyerServiceRequest } from '@/lib/supabase/buyer-service-request-realtime';
import { cn } from '@/lib/utils';
import { ArrowLeft, ExternalLink, Loader2, MapPin, Navigation, Phone } from 'lucide-react';

type TripRequest = {
  id: string;
  service: string;
  category: string;
  location: string;
  status: string;
  buyerContactPhone: string;
  buyerContactName: string;
  destinationLat: number | null;
  destinationLng: number | null;
  providerLat: number | null;
  providerLng: number | null;
};

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, '');
}

export default function ProviderTripPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = (params.requestId as string) || '';

  const [vendorId, setVendorId] = useState('');
  const [request, setRequest] = useState<TripRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myPos, setMyPos] = useState<TripMapPoint | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const lastSentRef = useRef<{ t: number; lat: number; lng: number } | null>(null);
  const geocodeTriedRef = useRef(false);

  useEffect(() => {
    geocodeTriedRef.current = false;
  }, [requestId]);

  useEffect(() => {
    const id = (typeof window !== 'undefined' && localStorage.getItem('currentVendorId')?.trim()) || '';
    setVendorId(id);
    if (!id) {
      router.replace(`/auth?role=services&next=${encodeURIComponent(`/services/orders/trip/${requestId}`)}`);
    }
  }, [requestId, router]);

  const load = useCallback(async () => {
    if (!requestId || !vendorId) return;
    try {
      const res = await fetch(`/api/vendor/service-requests/${encodeURIComponent(requestId)}?vendorId=${encodeURIComponent(vendorId)}`);
      if (!res.ok) {
        setError(res.status === 403 ? 'You are not assigned to this job.' : 'Could not load trip.');
        setRequest(null);
        return;
      }
      const json = (await res.json()) as { request: Record<string, unknown> };
      const r = json.request;
      setRequest({
        id: String(r.id),
        service: String(r.service ?? ''),
        category: String(r.category ?? ''),
        location: String(r.location ?? ''),
        status: String(r.status ?? ''),
        buyerContactPhone: String(r.buyerContactPhone ?? r.buyer_contact_phone ?? ''),
        buyerContactName: String(r.buyerContactName ?? r.buyer_contact_name ?? 'Customer'),
        destinationLat: r.destinationLat != null ? Number(r.destinationLat) : r.destination_lat != null ? Number(r.destination_lat) : null,
        destinationLng: r.destinationLng != null ? Number(r.destinationLng) : r.destination_lng != null ? Number(r.destination_lng) : null,
        providerLat: r.providerLat != null ? Number(r.providerLat) : r.provider_lat != null ? Number(r.provider_lat) : null,
        providerLng: r.providerLng != null ? Number(r.providerLng) : r.provider_lng != null ? Number(r.provider_lng) : null,
      });
      setError(null);
    } catch {
      setError('Could not load trip.');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [requestId, vendorId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!requestId.trim() || !vendorId.trim() || !request) return;
    const supabase = createClient();
    return subscribeToBuyerServiceRequest(supabase, requestId, (row) => {
      setRequest((prev) => (prev ? mergeRealtimeRowIntoTripRequest(prev, row) : prev));
    });
  }, [requestId, vendorId, request?.id]);

  const destinationPoint = useMemo((): TripMapPoint | null => {
    if (!request) return null;
    if (
      request.destinationLat != null &&
      request.destinationLng != null &&
      Number.isFinite(request.destinationLat) &&
      Number.isFinite(request.destinationLng)
    ) {
      return { lat: request.destinationLat, lng: request.destinationLng };
    }
    return null;
  }, [request]);

  useEffect(() => {
    if (!request || destinationPoint || !vendorId || geocodeTriedRef.current) return;
    const q = request.location?.trim();
    if (!q || q.length < 3) return;
    geocodeTriedRef.current = true;
    let cancelled = false;
    setGeocoding(true);
    void fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then(async (data: { lat?: number | null; lng?: number | null }) => {
        if (cancelled || data.lat == null || data.lng == null) return;
        await fetch('/api/vendor/service-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: request.id,
            vendorId,
            destinationLat: data.lat,
            destinationLng: data.lng,
          }),
        });
        void load();
      })
      .finally(() => {
        if (!cancelled) setGeocoding(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request, destinationPoint, vendorId, load]);

  useEffect(() => {
    if (!vendorId || !requestId || !request) return;
    if (request.status === 'completed' || request.status === 'cancelled') return;

    const watchId = navigator.geolocation?.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        setMyPos({ lat, lng });
        const now = Date.now();
        const prev = lastSentRef.current;
        const moved =
          !prev ||
          Math.abs(prev.lat - lat) > 0.00025 ||
          Math.abs(prev.lng - lng) > 0.00025 ||
          now - prev.t > 12000;
        if (!moved) return;
        lastSentRef.current = { t: now, lat, lng };
        void fetch('/api/vendor/service-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: requestId, vendorId, providerLat: lat, providerLng: lng }),
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 20000 },
    );

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [vendorId, requestId, request?.status]);

  const providerOnMap = useMemo(() => {
    if (myPos) return myPos;
    if (
      request?.providerLat != null &&
      request?.providerLng != null &&
      Number.isFinite(request.providerLat) &&
      Number.isFinite(request.providerLng)
    ) {
      return { lat: request.providerLat, lng: request.providerLng };
    }
    return null;
  }, [myPos, request?.providerLat, request?.providerLng]);

  const googleNavUrl = useMemo(() => {
    if (!destinationPoint) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${destinationPoint.lat},${destinationPoint.lng}&travelmode=driving`;
  }, [destinationPoint]);

  const telHref = request?.buyerContactPhone ? `tel:${digitsOnly(request.buyerContactPhone)}` : '';

  if (!vendorId && !loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-28 pt-4 md:max-w-2xl md:pb-10 md:pt-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 rounded-full" asChild>
          <Link href="/services/orders" aria-label="Back to orders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight md:text-xl">Heading to customer</h1>
          <p className="text-xs text-muted-foreground md:text-sm">Live map · your position is shared with the buyer</p>
        </div>
      </div>

      {error ? (
        <Card className="rounded-2xl border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</Card>
      ) : null}

      {loading && !request ? (
        <Skeleton className="h-[min(48vh,400px)] w-full rounded-2xl" />
      ) : request ? (
        <>
          <Card className="overflow-hidden rounded-2xl border-border/70 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job</p>
            <p className="mt-1 text-base font-semibold">{request.service}</p>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {request.location}
            </p>
          </Card>

          <div className="overflow-hidden rounded-2xl border border-border/70 shadow-md">
            <ServiceTripMap
              destination={destinationPoint}
              provider={providerOnMap}
              providerLabel="You (provider)"
              destinationLabel={`${request.buyerContactName || 'Customer'} — drop-off`}
            />
            {geocoding ? (
              <p className="border-t border-border/60 bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
                Pinning address on map…
              </p>
            ) : null}
          </div>

          <Card className="space-y-3 rounded-2xl border-border/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
            <div className="flex flex-wrap items-center gap-2">
              {telHref ? (
                <Button className="h-12 flex-1 gap-2 rounded-xl" asChild>
                  <a href={telHref}>
                    <Phone className="h-4 w-4" />
                    Call {request.buyerContactName || 'buyer'}
                  </a>
                </Button>
              ) : (
                <Button className="h-12 flex-1 gap-2 rounded-xl" type="button" disabled>
                  <Phone className="h-4 w-4" />
                  No phone
                </Button>
              )}
              {request.buyerContactPhone ? (
                <span className="w-full font-mono text-sm text-foreground md:w-auto">{request.buyerContactPhone}</span>
              ) : (
                <span className="text-sm text-muted-foreground">No phone on file</span>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            {googleNavUrl ? (
              <Button variant="secondary" className="h-12 flex-1 gap-2 rounded-xl" asChild>
                <a href={googleNavUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-4 w-4" />
                  Open in Maps
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              </Button>
            ) : null}
            <Button variant="outline" className={cn('h-12 rounded-xl', !googleNavUrl && 'flex-1')} asChild>
              <Link href="/services/orders">Orders list</Link>
            </Button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Enable location for this site so the buyer can see you moving toward them (like SafeBoda live tracking).
          </p>
        </>
      ) : null}
    </div>
  );
}
