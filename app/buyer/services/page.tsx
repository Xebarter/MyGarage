'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BUYER_SERVICE_COMPLETE_PENDING_PATH, savePendingBuyerServiceRequest } from '@/lib/buyer-service-pending';
import { userServiceCategories } from '@/lib/services-catalog';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Circle,
  CreditCard,
  Loader2,
  MapPin,
  Navigation,
  PencilLine,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type BuyerServiceRequest = {
  id: string;
  category: string;
  service: string;
  location: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  providerId?: string | null;
  acceptedAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

type ServiceProviderProfile = {
  id: string;
  name: string;
  location: string;
  services: string[];
  rating: number;
  jobsCompleted: number;
};

type BuyerProviderRating = {
  providerId: string;
  stars: number;
};

const PAY_CONTACT_NAME_KEY = 'servicePaymentContactName';
const PAY_CONTACT_EMAIL_KEY = 'servicePaymentContactEmail';
const PAY_CONTACT_PHONE_KEY = 'servicePaymentContactPhone';

const providerDirectory: ServiceProviderProfile[] = [
  {
    id: 'sp-1',
    name: 'Kampala Auto Rescue',
    location: 'Kampala',
    services: ['Towing & recovery', 'Jump-start', 'Fuel delivery', 'Battery sales & installation'],
    rating: 4.8,
    jobsCompleted: 312,
  },
  {
    id: 'sp-2',
    name: 'Prime Mechanics UG',
    location: 'Wakiso',
    services: ['Engine repair', 'Brake systems', 'Suspension & steering', 'Oil service'],
    rating: 4.6,
    jobsCompleted: 227,
  },
  {
    id: 'sp-3',
    name: 'CleanRide Detailing',
    location: 'Kampala',
    services: ['Basic wash', 'Detailing', 'Ceramic coating'],
    rating: 4.9,
    jobsCompleted: 418,
  },
];

function BuyerServicesPageInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const appliedDeepLinkSc = useRef(false);
  const appliedOpenQuickFromAuth = useRef(false);
  /** When true, do not auto-pick the first service — buyer must tap one (progressive quick flow). */
  const serviceAutofillSuppressed = useRef(false);
  const serviceSectionRef = useRef<HTMLDivElement | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(userServiceCategories[0]?.title || '');
  const [selectedService, setSelectedService] = useState(userServiceCategories[0]?.services[0] || '');
  const [manualLocation, setManualLocation] = useState('');
  const [detectedLocation, setDetectedLocation] = useState('');
  const [useDetectedLocation, setUseDetectedLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'ready' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('Detecting your current location...');
  const [locationAccuracyLabel, setLocationAccuracyLabel] = useState('');
  const [isQuickRequestDialogOpen, setIsQuickRequestDialogOpen] = useState(false);
  /** Quick dialog: service pick first, then location + submit. */
  const [quickRequestUiStep, setQuickRequestUiStep] = useState<'service' | 'location'>('service');
  const [requests, setRequests] = useState<BuyerServiceRequest[]>([]);
  const [ratings, setRatings] = useState<BuyerProviderRating[]>([]);
  const [paying, setPaying] = useState(false);
  const [identityMode, setIdentityMode] = useState<'buyer' | 'guest'>('guest');
  const [payContactName, setPayContactName] = useState('');
  const [payContactEmail, setPayContactEmail] = useState('');
  const [payContactPhone, setPayContactPhone] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (appliedOpenQuickFromAuth.current) return;
    if (searchParams.get('openQuick') !== '1') return;
    appliedOpenQuickFromAuth.current = true;
    serviceAutofillSuppressed.current = true;
    setSelectedService('');
    setQuickRequestUiStep('service');
    setIsQuickRequestDialogOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('openQuick');
    const q = params.toString();
    router.replace(`${pathname}${q ? `?${q}` : ''}`, { scroll: false });
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (appliedDeepLinkSc.current) return;
    const sc = (searchParams.get('sc') || '').trim();
    const ss = (searchParams.get('ss') || '').trim();
    if (!sc && !ss) return;

    const openQuickDialog =
      searchParams.get('quick') === '1' ||
      searchParams.get('quick') === 'true' ||
      searchParams.get('quick') === 'yes';

    const stripQuickFromUrl = () => {
      if (!openQuickDialog) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete('quick');
      const q = params.toString();
      router.replace(`${pathname}${q ? `?${q}` : ''}`, { scroll: false });
    };

    if (sc) {
      const cat = userServiceCategories.find((c) => c.id === sc);
      if (cat) {
        appliedDeepLinkSc.current = true;
        setSelectedCategory(cat.title);
        if (ss) {
          const exact = cat.services.find((s) => s === ss);
          const ci = cat.services.find((s) => s.toLowerCase() === ss.toLowerCase());
          serviceAutofillSuppressed.current = false;
          setSelectedService(exact || ci || cat.services[0] || '');
          if (openQuickDialog) {
            setQuickRequestUiStep('location');
            setIsQuickRequestDialogOpen(true);
            stripQuickFromUrl();
          }
        } else if (openQuickDialog) {
          serviceAutofillSuppressed.current = true;
          setSelectedService('');
          setQuickRequestUiStep('service');
          setIsQuickRequestDialogOpen(true);
          stripQuickFromUrl();
        } else {
          setSelectedService(cat.services[0] || '');
        }
        return;
      }
    }

    if (ss) {
      for (const c of userServiceCategories) {
        const exact = c.services.find((s) => s === ss);
        const ci = c.services.find((s) => s.toLowerCase() === ss.toLowerCase());
        if (exact || ci) {
          appliedDeepLinkSc.current = true;
          setSelectedCategory(c.title);
          serviceAutofillSuppressed.current = false;
          setSelectedService(exact || ci || '');
          if (openQuickDialog) {
            setQuickRequestUiStep('location');
            setIsQuickRequestDialogOpen(true);
            stripQuickFromUrl();
          }
          return;
        }
      }
    }
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (!customerId) return;
    void loadServiceData(customerId);
  }, [customerId]);

  const selectedCategoryMeta = useMemo(
    () => userServiceCategories.find((category) => category.title === selectedCategory) || userServiceCategories[0],
    [selectedCategory]
  );

  const suggestedServices = useMemo(() => selectedCategoryMeta?.services || [], [selectedCategoryMeta]);
  const resolvedLocation = useMemo(
    () => (useDetectedLocation ? detectedLocation.trim() : manualLocation.trim()),
    [useDetectedLocation, detectedLocation, manualLocation]
  );

  const getCurrentPosition = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const detectCurrentLocation = async () => {
    if (typeof window === 'undefined') return;

    if (!window.isSecureContext) {
      setLocationStatus('error');
      setDetectedLocation('');
      setLocationAccuracyLabel('');
      setLocationMessage('Location requires a secure connection (HTTPS or localhost). Please switch to manual location.');
      setUseDetectedLocation(false);
      return;
    }

    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      setDetectedLocation('');
      setLocationMessage('Location services are not supported on this device. Use a manual location instead.');
      setUseDetectedLocation(false);
      return;
    }

    let currentPermissionState: PermissionState | 'unknown' = 'unknown';
    if ('permissions' in navigator && navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        currentPermissionState = permission.state;
      } catch {
        currentPermissionState = 'unknown';
      }
    }

    setLocationStatus('detecting');
    setLocationMessage('Detecting your current location...');
    setLocationAccuracyLabel('');

    try {
      // Try high accuracy first, then fall back to faster low accuracy if needed.
      const position =
        (await getCurrentPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }).catch(() =>
          getCurrentPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 })
        )) || null;

      if (!position) {
        throw new Error('location_unavailable');
      }

      const { latitude, longitude, accuracy } = position.coords;
      setDetectedLocation(`Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
      setLocationAccuracyLabel(Number.isFinite(accuracy) ? `Approx. accuracy: ${Math.round(accuracy)}m` : '');
      setLocationMessage('Location detected. You can retry for a fresh fix.');
      setLocationStatus('ready');
    } catch (error) {
      const geolocationError = error as GeolocationPositionError | Error;
      setLocationStatus('error');
      setDetectedLocation('');
      setLocationAccuracyLabel('');

      if ('code' in geolocationError && geolocationError.code === 1) {
        if (currentPermissionState === 'prompt') {
          setLocationMessage(
            'Location was blocked before prompting (browser/site policy). Check site location settings, then retry.'
          );
        } else {
          setLocationMessage('Location access is blocked. Allow location in browser/site settings or enter it manually.');
        }
        setUseDetectedLocation(false);
        return;
      }

      if ('code' in geolocationError && geolocationError.code === 3) {
        setLocationMessage('Location request timed out. Retry or enter your location manually.');
        return;
      }

      setLocationMessage('Could not detect location. Check GPS/network and retry, or use manual location.');
    }
  };

  useEffect(() => {
    if (!selectedCategoryMeta) return;
    if (serviceAutofillSuppressed.current && selectedService === '') return;
    if (!selectedCategoryMeta.services.includes(selectedService)) {
      setSelectedService(selectedCategoryMeta.services[0] || '');
    }
  }, [selectedCategoryMeta, selectedService]);

  useEffect(() => {
    detectCurrentLocation();
  }, []);

  const persistPayContact = useCallback(() => {
    try {
      if (payContactName.trim()) localStorage.setItem(PAY_CONTACT_NAME_KEY, payContactName.trim());
      if (payContactEmail.trim()) localStorage.setItem(PAY_CONTACT_EMAIL_KEY, payContactEmail.trim());
      if (payContactPhone.trim()) localStorage.setItem(PAY_CONTACT_PHONE_KEY, payContactPhone.trim());
    } catch {
      /* ignore */
    }
  }, [payContactName, payContactEmail, payContactPhone]);

  const bootstrap = async () => {
    try {
      const localId = (localStorage.getItem('currentBuyerId') || '').trim();
      if (localId) {
        setIdentityMode('buyer');
        setCustomerId(localId);
        return;
      }

      const savedEmail = (localStorage.getItem('currentBuyerEmail') || '').trim();
      if (savedEmail) {
        const byEmail = await fetch(`/api/customers?email=${encodeURIComponent(savedEmail)}`);
        if (byEmail.ok) {
          const customer = (await byEmail.json()) as { id: string };
          if (customer?.id) {
            setIdentityMode('buyer');
            setCustomerId(customer.id);
            localStorage.setItem('currentBuyerId', customer.id);
            return;
          }
        }
      }

      setIdentityMode('guest');
      setCustomerId('');
    } catch (error) {
      console.error('Failed to resolve customer for services:', error);
    } finally {
      setSessionReady(true);
    }
  };

  useEffect(() => {
    const name =
      (localStorage.getItem(PAY_CONTACT_NAME_KEY) || localStorage.getItem('currentBuyerName') || '').trim();
    const email = (localStorage.getItem(PAY_CONTACT_EMAIL_KEY) || localStorage.getItem('currentBuyerEmail') || '').trim();
    const phone = (localStorage.getItem(PAY_CONTACT_PHONE_KEY) || localStorage.getItem('currentBuyerPhone') || '').trim();
    if (name) setPayContactName(name);
    if (email) setPayContactEmail(email);
    if (phone) setPayContactPhone(phone);
  }, []);

  const loadServiceData = async (id: string) => {
    try {
      const [requestsResponse, ratingsResponse] = await Promise.all([
        fetch(`/api/buyer/service-requests?customerId=${encodeURIComponent(id)}`),
        fetch(`/api/buyer/provider-ratings?customerId=${encodeURIComponent(id)}`),
      ]);

      if (requestsResponse.ok) {
        const requestsData = (await requestsResponse.json()) as BuyerServiceRequest[];
        setRequests(Array.isArray(requestsData) ? requestsData : []);
      } else {
        setRequests([]);
      }

      if (ratingsResponse.ok) {
        const ratingsData = (await ratingsResponse.json()) as BuyerProviderRating[];
        setRatings(Array.isArray(ratingsData) ? ratingsData : []);
      } else {
        setRatings([]);
      }
    } catch (error) {
      console.error('Failed to load buyer services data:', error);
      setRequests([]);
      setRatings([]);
    }
  };

  const matchingProviders = useMemo(() => {
    const needle = selectedService.toLowerCase();
    return providerDirectory
      .filter((provider) => provider.services.some((service) => service.toLowerCase().includes(needle.split(' ')[0])))
      .sort((a, b) => b.rating - a.rating);
  }, [selectedService]);

  const requestStats = useMemo(() => {
    const pending = requests.filter((item) => item.status === 'pending').length;
    const active = requests.filter((item) => item.status === 'matched' || item.status === 'in_progress').length;
    const completed = requests.filter((item) => item.status === 'completed').length;
    return { pending, active, completed };
  }, [requests]);

  const activeServiceRequest = useMemo(() => {
    return requests.find((item) => item.status === 'matched' || item.status === 'in_progress' || item.status === 'completed');
  }, [requests]);

  const activeServiceProvider = useMemo(() => {
    if (!activeServiceRequest) return null;
    const needle = activeServiceRequest.service.toLowerCase().split(' ')[0];
    return providerDirectory.find((provider) => provider.services.some((service) => service.toLowerCase().includes(needle))) ?? null;
  }, [activeServiceRequest]);

  const paymentSummary = useMemo(() => {
    if (!activeServiceRequest) return null;
    const base = activeServiceRequest.status === 'completed' ? 130000 : activeServiceRequest.status === 'in_progress' ? 95000 : 50000;
    const platformFee = Math.round(base * 0.05);
    const total = base + platformFee;
    return { base, platformFee, total };
  }, [activeServiceRequest]);

  const submitRequest = async () => {
    if (identityMode !== 'buyer' || !selectedService || !resolvedLocation || !customerId) return;
    setSubmitError(null);
    try {
      let coords: { destinationLat: number; destinationLng: number } | Record<string, never> = {};
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 120000,
          });
        });
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        if (Number.isFinite(la) && Number.isFinite(ln)) {
          coords = { destinationLat: la, destinationLng: ln };
        }
      } catch {
        /* optional — address text still sent */
      }
      const response = await fetch('/api/buyer/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          category: selectedCategory,
          service: selectedService,
          location: resolvedLocation,
          ...coords,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setSubmitError(body.error || 'Could not submit your request. Try again.');
        return;
      }
      const raw = (await response.json()) as Record<string, unknown>;
      const created: BuyerServiceRequest = {
        id: String(raw.id),
        category: String(raw.category),
        service: String(raw.service),
        location: String(raw.location),
        status: raw.status as BuyerServiceRequest['status'],
        providerId: (raw.providerId as string | null | undefined) ?? (raw.provider_id as string | null | undefined) ?? null,
        createdAt:
          typeof raw.createdAt === 'string'
            ? raw.createdAt
            : typeof raw.created_at === 'string'
              ? raw.created_at
              : new Date().toISOString(),
      };
      setRequests((current) => [created, ...current]);
      setIsQuickRequestDialogOpen(false);
      router.push(`/buyer/services/track/${encodeURIComponent(created.id)}`);
    } catch (error) {
      console.error('Failed to create buyer service request:', error);
    }
  };

  const canPayForService = useMemo(() => {
    const name = payContactName.trim();
    const email = payContactEmail.trim();
    const phone = payContactPhone.replace(/\D/g, '');
    return Boolean(name && email && phone.length >= 9);
  }, [payContactName, payContactEmail, payContactPhone]);

  const payForActiveService = async () => {
    if (!activeServiceRequest || !paymentSummary || !customerId || paying || !canPayForService) return;
    persistPayContact();
    setPaying(true);
    try {
      const response = await fetch('/api/paytota/service-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: activeServiceRequest.id,
          customerId,
          customerName: payContactName.trim(),
          customerEmail: payContactEmail.trim().toLowerCase(),
          customerPhone: payContactPhone.trim(),
          amount: paymentSummary.total,
        }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
      }
    } catch (error) {
      console.error('Failed to initialize service payment:', error);
    } finally {
      setPaying(false);
    }
  };

  const rateProvider = async (providerId: string, stars: number) => {
    if (!customerId) return;
    try {
      const response = await fetch('/api/buyer/provider-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, providerId, stars }),
      });
      if (!response.ok) return;
      const saved = (await response.json()) as BuyerProviderRating;
      setRatings((current) => {
        const existing = current.find((item) => item.providerId === providerId);
        if (existing) {
          return current.map((item) => (item.providerId === providerId ? { ...item, stars: saved.stars } : item));
        }
        return [...current, { providerId: saved.providerId, stars: saved.stars }];
      });
    } catch (error) {
      console.error('Failed to save provider rating:', error);
    }
  };

  const getMyRating = (providerId: string) => ratings.find((item) => item.providerId === providerId)?.stars || 0;
  const canPressSubmitRequest = Boolean(selectedService && resolvedLocation && (identityMode !== 'buyer' || customerId));
  const canSubmitQuickRequest = canPressSubmitRequest && quickRequestUiStep === 'location';

  const goBackToQuickServiceStep = () => {
    serviceAutofillSuppressed.current = true;
    setSelectedService('');
    setQuickRequestUiStep('service');
    window.setTimeout(() => {
      serviceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const goToBuyerSignInForRequest = () => {
    savePendingBuyerServiceRequest({
      category: selectedCategory,
      service: selectedService,
      location: resolvedLocation,
    });
    router.push(`/auth?role=buyer&next=${encodeURIComponent(BUYER_SERVICE_COMPLETE_PENDING_PATH)}`);
  };

  const handleSubmitRequestIntent = () => {
    setSubmitError(null);
    if (!selectedService || !resolvedLocation) return;
    if (identityMode !== 'buyer' || !customerId) {
      goToBuyerSignInForRequest();
      return;
    }
    void submitRequest();
  };

  const renderStep = (label: string, done: boolean) => (
    <div className="flex min-h-12 items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
      {done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
      <p className={`text-sm ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
    </div>
  );

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20 p-3 pb-28 sm:p-5 sm:pb-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Buyer Workspace</p>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Find Help Fast</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Choose your need, confirm location, and submit in under a minute. Sign in is required to send a request so we can match you to providers in real time.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs md:min-w-[290px]">
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-muted-foreground">Pending</p>
                <p className="mt-1 text-base font-semibold sm:text-lg">{requestStats.pending}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-muted-foreground">Active</p>
                <p className="mt-1 text-base font-semibold sm:text-lg">{requestStats.active}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-muted-foreground">Completed</p>
                <p className="mt-1 text-base font-semibold sm:text-lg">{requestStats.completed}</p>
              </div>
            </div>
          </div>
          {sessionReady && identityMode !== 'buyer' ? (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link
                href="/auth?role=buyer&next=%2Fbuyer%2Fservices%3FopenQuick%3D1"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in or create a buyer account
              </Link>{' '}
              to submit a service request and see live tracking.
            </p>
          ) : null}
        </div>

        {activeServiceRequest ? (
          <Card className="rounded-2xl border-border/70 p-4 shadow-sm sm:p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Active Service</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{activeServiceRequest.service}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeServiceRequest.category} - {activeServiceRequest.location}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-primary">Status: {activeServiceRequest.status.replace('_', ' ')}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/80 p-3 text-sm">
                <p className="font-medium">{activeServiceProvider?.name || 'Assigned Provider'}</p>
                <p className="text-xs text-muted-foreground">
                  {activeServiceProvider
                    ? `${activeServiceProvider.location} - ${activeServiceProvider.rating.toFixed(1)} avg`
                    : 'Provider confirmation is in progress'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {renderStep('Request accepted', activeServiceRequest.status !== 'pending')}
              {renderStep('Provider heading to location', activeServiceRequest.status === 'in_progress' || activeServiceRequest.status === 'completed')}
              {renderStep('Service completed', activeServiceRequest.status === 'completed')}
              {renderStep('Payment confirmed', activeServiceRequest.status === 'completed')}
            </div>

            {paymentSummary ? (
              <div className="mt-5 rounded-xl border border-border/70 bg-background/70 p-4">
                <p className="inline-flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4" /> Payment Snapshot
                </p>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                  <p className="rounded-lg border border-border/60 bg-background px-3 py-2">Service fee: UGX {paymentSummary.base.toLocaleString()}</p>
                  <p className="rounded-lg border border-border/60 bg-background px-3 py-2">Platform fee: UGX {paymentSummary.platformFee.toLocaleString()}</p>
                  <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 font-semibold">
                    Total: UGX {paymentSummary.total.toLocaleString()}
                  </p>
                </div>
                <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment contact (required for checkout)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No account needed — we only use this to process your payment with Paytota.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={payContactName}
                      onChange={(e) => setPayContactName(e.target.value)}
                      onBlur={persistPayContact}
                      placeholder="Full name"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      autoComplete="name"
                    />
                    <input
                      type="email"
                      value={payContactEmail}
                      onChange={(e) => setPayContactEmail(e.target.value)}
                      onBlur={persistPayContact}
                      placeholder="Email"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      autoComplete="email"
                    />
                    <input
                      type="tel"
                      value={payContactPhone}
                      onChange={(e) => setPayContactPhone(e.target.value)}
                      onBlur={persistPayContact}
                      placeholder="Mobile (e.g. 07… or 256…)"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={payForActiveService}
                    disabled={paying || !canPayForService}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {paying ? 'Redirecting to Paytota...' : 'Pay for this service'}
                  </button>
                </div>
              </div>
            ) : null}

            {identityMode === 'buyer' ? (
              <div className="mt-5 grid gap-2 md:grid-cols-3">
                <Link href="/buyer/orders" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-muted/40">
                  View order and payment history
                </Link>
                <Link href="/buyer/support" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-muted/40">
                  Contact support about this service
                </Link>
                <Link href="/buyer/addresses" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-muted/40">
                  Manage saved service locations
                </Link>
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                <Link href="/auth?role=buyer&next=/buyer" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in or create a buyer account
                </Link>{' '}
                to track requests and payments across devices.
              </p>
            )}
          </Card>
        ) : (
          <Card className="rounded-2xl border-border/70 p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold tracking-tight">Quick Request</h2>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Timer className="h-3.5 w-3.5" /> 3 quick steps
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">1. What do you need?</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-2">
                {userServiceCategories.slice(0, 8).map((category) => {
                  const isActive = selectedCategory === category.title;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.title);
                        serviceAutofillSuppressed.current = true;
                        setSelectedService('');
                        setQuickRequestUiStep('service');
                        setIsQuickRequestDialogOpen(true);
                      }}
                      className={`min-h-[92px] rounded-xl border px-3 py-3 text-left transition ${
                        isActive ? 'border-primary bg-primary/10' : 'border-border/70 bg-background hover:bg-muted/40'
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {category.emoji} {category.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{category.useWhen}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
              Choose a quick request above to continue in a simplified popup flow.
            </div>
          </Card>
        )}

        <Card className="rounded-2xl border-border/70 p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold tracking-tight">My Service Requests</h2>
            <p className="text-xs text-muted-foreground">{requests.length} total</p>
          </div>
          <div className="space-y-3">
            {requests.slice(0, 6).map((request) => (
              <div key={request.id} className="rounded-xl border border-border/70 p-3.5 sm:p-4">
                <p className="font-medium text-foreground">
                  {request.service} - {request.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.category} - {request.location} - {new Date(request.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-primary">Status: {request.status}</p>
                {identityMode === 'buyer' ? (
                  <Link
                    href={`/buyer/services/track/${encodeURIComponent(request.id)}`}
                    className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View live tracking
                  </Link>
                ) : null}
              </div>
            ))}
            {requests.length === 0 ? <p className="text-sm text-muted-foreground">No requests yet. Submit your first service request above.</p> : null}
          </div>
        </Card>
      </div>
      {!activeServiceRequest ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 p-3 backdrop-blur sm:hidden">
          <button
            type="button"
            onClick={() => {
              serviceAutofillSuppressed.current = true;
              setSelectedService('');
              setQuickRequestUiStep('service');
              setIsQuickRequestDialogOpen(true);
            }}
            disabled={!selectedCategory}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue Quick Request <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <Dialog
        open={isQuickRequestDialogOpen}
        onOpenChange={(open) => {
          setIsQuickRequestDialogOpen(open);
          if (!open) {
            serviceAutofillSuppressed.current = false;
            setQuickRequestUiStep('service');
          }
        }}
      >
        <DialogContent
          showCloseButton={quickRequestUiStep === 'service'}
          onEscapeKeyDown={(e) => {
            if (quickRequestUiStep === 'location') {
              e.preventDefault();
              goBackToQuickServiceStep();
            }
          }}
          className="flex max-h-[92dvh] min-h-[min(72dvh,640px)] w-full max-w-full flex-col gap-0 overflow-hidden p-0 max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-xl"
        >
          <div className="relative flex min-h-[min(72dvh,640px)] flex-1 flex-col">
            {quickRequestUiStep === 'service' ? (
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Choose your service</DialogTitle>
                  <DialogDescription>
                    Step 1 of 2 — Pick the exact service you need. Next, a full location screen opens on top of this one.
                  </DialogDescription>
                </DialogHeader>

                <p className="text-xs font-medium text-muted-foreground">
                  <span className="text-primary">①</span> Service{' '}
                  <span className="text-muted-foreground/60">→</span> <span className="opacity-70">② Location</span>
                </p>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected category</p>
                  <div className="rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm font-medium">
                    {selectedCategory || 'Select a quick request first'}
                  </div>
                </div>

                <div ref={serviceSectionRef} className="rounded-xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Select a specific service
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {suggestedServices.slice(0, 8).map((service, index) => {
                      const isSelected = selectedService === service;
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => {
                            serviceAutofillSuppressed.current = false;
                            setSelectedService(service);
                            setQuickRequestUiStep('location');
                          }}
                          className={cn(
                            'rounded-xl border px-3 py-3 text-left transition',
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                              : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-snug">{service}</p>
                            <span
                              className={cn(
                                'mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border text-[10px]',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background text-muted-foreground',
                              )}
                            >
                              {isSelected ? '✓' : index + 1}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {isSelected
                              ? 'Opens the location screen — use back there to pick a different service.'
                              : 'Tap to open the location screen on top'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  After you choose a service, the <span className="font-medium text-foreground">Your location</span> page slides
                  over this panel so you can confirm where providers should meet you — same idea as this panel sitting over the
                  Quick Request section behind it.
                </p>
              </div>
            ) : null}

            {quickRequestUiStep === 'location' ? (
              <div
                className="absolute inset-0 z-10 flex animate-in fade-in zoom-in-[0.99] flex-col bg-gradient-to-b from-background via-background to-muted/15 duration-200 sm:rounded-lg"
                role="region"
                aria-labelledby="quick-request-location-title"
              >
                <header className="shrink-0 border-b border-border/50 bg-background/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={goBackToQuickServiceStep}
                      className="inline-flex h-11 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-full border border-border/80 bg-background text-foreground shadow-sm transition active:scale-[0.97] hover:bg-muted/50"
                      aria-label="Back to service selection"
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
                    </button>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <span className="mb-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Step 2 of 2
                      </span>
                      <h2
                        id="quick-request-location-title"
                        className="text-balance text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl"
                      >
                        Where should we meet you?
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
                        <span className="font-medium text-foreground/90">{selectedService}</span>
                        {selectedCategory ? (
                          <>
                            <span className="text-muted-foreground/70"> · </span>
                            {selectedCategory}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                  <div className="mx-auto flex max-w-md flex-col gap-5">
                    <div className="flex justify-center">
                      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent shadow-inner ring-1 ring-primary/15">
                        <MapPin className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
                        {locationStatus === 'detecting' ? (
                          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-background shadow-md">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
                          </span>
                        ) : locationStatus === 'ready' && useDetectedLocation ? (
                          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md">
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <p className="text-center text-sm leading-relaxed text-muted-foreground">
                      Share your <span className="font-medium text-foreground">service spot</span> so providers can route to you
                      without back-and-forth.
                    </p>

                    <div
                      className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border/60 bg-muted/40 p-1.5 shadow-sm"
                      role="tablist"
                      aria-label="Location source"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={useDetectedLocation}
                        onClick={() => setUseDetectedLocation(true)}
                        className={cn(
                          'flex min-h-[48px] touch-manipulation items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition active:scale-[0.99]',
                          useDetectedLocation
                            ? 'bg-background text-foreground shadow-sm ring-1 ring-border/80'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Navigation className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        <span className="truncate">Use GPS</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={!useDetectedLocation}
                        onClick={() => setUseDetectedLocation(false)}
                        className={cn(
                          'flex min-h-[48px] touch-manipulation items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition active:scale-[0.99]',
                          !useDetectedLocation
                            ? 'bg-background text-foreground shadow-sm ring-1 ring-border/80'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <PencilLine className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        <span className="truncate">Type it</span>
                      </button>
                    </div>

                    {useDetectedLocation ? (
                      <div className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                              locationStatus === 'ready'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : locationStatus === 'detecting'
                                  ? 'bg-primary/15 text-primary'
                                  : locationStatus === 'error'
                                    ? 'bg-destructive/15 text-destructive'
                                    : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {locationStatus === 'detecting'
                              ? 'Locating…'
                              : locationStatus === 'ready'
                                ? 'Pin ready'
                                : locationStatus === 'error'
                                  ? 'Needs attention'
                                  : 'Idle'}
                          </span>
                          {locationStatus === 'ready' && locationAccuracyLabel ? (
                            <span className="text-[11px] text-muted-foreground">{locationAccuracyLabel}</span>
                          ) : null}
                        </div>
                        <p className="break-words text-[15px] leading-snug text-foreground sm:text-sm">
                          {locationStatus === 'ready' && detectedLocation
                            ? detectedLocation
                            : locationMessage}
                        </p>
                        <button
                          type="button"
                          onClick={detectCurrentLocation}
                          disabled={locationStatus === 'detecting'}
                          className="flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition hover:bg-muted/50 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
                        >
                          {locationStatus === 'detecting' ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Navigation className="h-4 w-4 opacity-70" aria-hidden />
                          )}
                          Refresh location
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
                        <label htmlFor="quick-request-manual-location" className="text-sm font-semibold text-foreground">
                          Area or address
                        </label>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Neighborhood, landmark, or street — whatever helps a driver find you.
                        </p>
                        <input
                          id="quick-request-manual-location"
                          value={manualLocation}
                          onChange={(e) => setManualLocation(e.target.value)}
                          placeholder="e.g. Ntinda, near Capital Shoppers"
                          autoComplete="street-address"
                          className="min-h-[52px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground shadow-sm transition-[box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <footer className="shrink-0 space-y-3 border-t border-border/50 bg-background/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
                  <button
                    type="button"
                    onClick={handleSubmitRequestIntent}
                    disabled={!canSubmitQuickRequest}
                    className="inline-flex min-h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:min-h-12 sm:text-sm"
                  >
                    Submit request
                    <ArrowRight className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                  </button>
                  {!canPressSubmitRequest ? (
                    <p className="text-center text-xs leading-relaxed text-muted-foreground">
                      {useDetectedLocation
                        ? 'Allow location or refresh until we have a fix, or switch to “Type it”.'
                        : 'Enter where you are so we can submit your request.'}
                    </p>
                  ) : null}
                  {submitError ? <p className="text-center text-sm font-medium text-destructive">{submitError}</p> : null}
                  {identityMode !== 'buyer' ? (
                    <p className="text-center text-xs leading-relaxed text-muted-foreground">
                      You’ll sign in next so we can save your request and match you with a provider.
                    </p>
                  ) : null}
                </footer>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BuyerServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] bg-background p-8 text-center text-sm text-muted-foreground">Loading services…</div>
      }
    >
      <BuyerServicesPageInner />
    </Suspense>
  );
}
