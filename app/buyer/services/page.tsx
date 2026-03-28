'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BUYER_SERVICE_COMPLETE_PENDING_PATH, savePendingBuyerServiceRequest } from '@/lib/buyer-service-pending';
import { userServiceCategories } from '@/lib/services-catalog';
import { ArrowRight, CheckCircle2, Circle, CreditCard, MapPin, Timer } from 'lucide-react';
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
          setSelectedService(exact || ci || cat.services[0] || '');
        } else {
          setSelectedService(cat.services[0] || '');
        }
        if (openQuickDialog) {
          setIsQuickRequestDialogOpen(true);
          stripQuickFromUrl();
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
          setSelectedService(exact || ci || '');
          if (openQuickDialog) {
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
      const response = await fetch('/api/buyer/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          category: selectedCategory,
          service: selectedService,
          location: resolvedLocation,
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
                        setSelectedService(category.services[0] || '');
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
            onClick={() => setIsQuickRequestDialogOpen(true)}
            disabled={!selectedCategory}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue Quick Request <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <Dialog open={isQuickRequestDialogOpen} onOpenChange={setIsQuickRequestDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto p-4 sm:max-w-xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Finish your quick request</DialogTitle>
            <DialogDescription>Select service details and confirm your location.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected category</p>
              <div className="rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm font-medium">
                {selectedCategory || 'Select a quick request first'}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. Select a specific service</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestedServices.slice(0, 8).map((service, index) => {
                  const isSelected = selectedService === service;
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => setSelectedService(service)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                          : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{service}</p>
                        <span
                          className={`mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border text-[10px] ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground'
                          }`}
                        >
                          {isSelected ? '✓' : index + 1}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{isSelected ? 'Selected service' : 'Tap to select this option'}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">3. Your location</label>
              <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                      <MapPin className="h-4 w-4" /> {useDetectedLocation ? 'Using current location' : 'Using different location'}
                    </p>
                    {useDetectedLocation ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>
                          {locationStatus === 'ready' && detectedLocation ? detectedLocation : locationMessage}
                        </p>
                        {locationStatus === 'ready' && locationAccuracyLabel ? <p>{locationAccuracyLabel}</p> : null}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseDetectedLocation((current) => !current)}
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted/40"
                  >
                    {useDetectedLocation ? 'Choose different' : 'Use current'}
                  </button>
                </div>

                {useDetectedLocation ? (
                  <button
                    type="button"
                    onClick={detectCurrentLocation}
                    className="mt-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-muted/40"
                  >
                    Retry detection
                  </button>
                ) : (
                  <input
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="e.g. Ntinda, Kampala"
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitRequestIntent}
              disabled={!canPressSubmitRequest}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit Request <ArrowRight className="h-4 w-4" />
            </button>
            {submitError ? <p className="text-center text-sm text-destructive">{submitError}</p> : null}
            {identityMode !== 'buyer' ? (
              <p className="text-center text-xs text-muted-foreground">
                Sign in with email and password, then add your mobile number so providers can reach you. Your request is saved and finishes automatically after that.
              </p>
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
