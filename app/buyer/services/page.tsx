'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BuyerServiceQuickRequestDialog } from '@/components/buyer/buyer-service-quick-request-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BUYER_SERVICE_COMPLETE_PENDING_PATH, savePendingBuyerServiceRequest } from '@/lib/buyer-service-pending';
import { userServiceCategories } from '@/lib/services-catalog';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  CreditCard,
  History,
  RefreshCw,
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

type ServiceHistoryTab = 'all' | 'open' | 'completed' | 'cancelled';

function statusRank(status: BuyerServiceRequest['status']): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'matched':
      return 1;
    case 'in_progress':
      return 2;
    case 'completed':
      return 4;
    case 'cancelled':
      return 5;
    default:
      return 3;
  }
}

function formatHistoryWhen(iso: string): { primary: string; full: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { primary: '—', full: '—' };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDay.getTime()) / 86400000);
  let primary: string;
  if (diffDays === 0) primary = `Today · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  else if (diffDays === 1) primary = `Yesterday · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  else if (diffDays > 1 && diffDays < 7) primary = `${diffDays} days ago`;
  else primary = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const full = d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return { primary, full };
}

function serviceStatusPresentation(status: BuyerServiceRequest['status']): {
  label: string;
  borderClass: string;
  badgeClass: string;
} {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending match',
        borderClass: 'border-l-amber-500',
        badgeClass:
          'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100 font-medium',
      };
    case 'matched':
      return {
        label: 'Provider assigned',
        borderClass: 'border-l-sky-500',
        badgeClass: 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100 font-medium',
      };
    case 'in_progress':
      return {
        label: 'In progress',
        borderClass: 'border-l-violet-500',
        badgeClass: 'border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100 font-medium',
      };
    case 'completed':
      return {
        label: 'Completed',
        borderClass: 'border-l-emerald-500',
        badgeClass: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-medium',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        borderClass: 'border-l-muted-foreground',
        badgeClass: 'border-border bg-muted text-muted-foreground font-medium',
      };
    default:
      return {
        label: status,
        borderClass: 'border-l-border',
        badgeClass: 'border-border bg-muted text-muted-foreground font-medium',
      };
  }
}

function buildServiceHistoryList(requests: BuyerServiceRequest[], tab: ServiceHistoryTab): BuyerServiceRequest[] {
  let list = [...requests];
  if (tab === 'open') {
    list = list.filter((r) => r.status === 'pending' || r.status === 'matched' || r.status === 'in_progress');
  } else if (tab === 'completed') {
    list = list.filter((r) => r.status === 'completed');
  } else if (tab === 'cancelled') {
    list = list.filter((r) => r.status === 'cancelled');
  }

  if (tab === 'all') {
    list.sort((a, b) => {
      const diff = statusRank(a.status) - statusRank(b.status);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return list;
}

function normalizeBuyerServiceRequest(raw: Record<string, unknown>): BuyerServiceRequest | null {
  const id = typeof raw.id === 'string' ? raw.id : null;
  if (!id) return null;
  const statusRaw = String(raw.status ?? '');
  const allowed: BuyerServiceRequest['status'][] = ['pending', 'matched', 'in_progress', 'completed', 'cancelled'];
  const status = allowed.includes(statusRaw as BuyerServiceRequest['status'])
    ? (statusRaw as BuyerServiceRequest['status'])
    : 'pending';
  const createdRaw = raw.createdAt ?? raw.created_at;
  const createdAt =
    typeof createdRaw === 'string' ? createdRaw : createdRaw instanceof Date ? createdRaw.toISOString() : new Date().toISOString();
  return {
    id,
    category: String(raw.category ?? ''),
    service: String(raw.service ?? ''),
    location: String(raw.location ?? ''),
    status,
    providerId:
      typeof raw.providerId === 'string'
        ? raw.providerId
        : typeof raw.provider_id === 'string'
          ? raw.provider_id
          : null,
    acceptedAt:
      typeof raw.acceptedAt === 'string'
        ? raw.acceptedAt
        : typeof raw.accepted_at === 'string'
          ? raw.accepted_at
          : null,
    arrivedAt:
      typeof raw.arrivedAt === 'string'
        ? raw.arrivedAt
        : typeof raw.arrived_at === 'string'
          ? raw.arrived_at
          : null,
    startedAt:
      typeof raw.startedAt === 'string'
        ? raw.startedAt
        : typeof raw.started_at === 'string'
          ? raw.started_at
          : null,
    completedAt:
      typeof raw.completedAt === 'string'
        ? raw.completedAt
        : typeof raw.completed_at === 'string'
          ? raw.completed_at
          : null,
    createdAt,
  };
}

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
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<ServiceHistoryTab>('all');
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
    setRequestsLoading(true);
    try {
      const [requestsResponse, ratingsResponse] = await Promise.all([
        fetch(`/api/buyer/service-requests?customerId=${encodeURIComponent(id)}`),
        fetch(`/api/buyer/provider-ratings?customerId=${encodeURIComponent(id)}`),
      ]);

      if (requestsResponse.ok) {
        const raw = (await requestsResponse.json()) as unknown;
        const list = Array.isArray(raw) ? raw : [];
        const normalized = list
          .map((item) => normalizeBuyerServiceRequest(item as Record<string, unknown>))
          .filter((x): x is BuyerServiceRequest => x != null);
        setRequests(normalized);
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
    } finally {
      setRequestsLoading(false);
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

  const historyCounts = useMemo(() => {
    const open = requests.filter(
      (r) => r.status === 'pending' || r.status === 'matched' || r.status === 'in_progress',
    ).length;
    return {
      all: requests.length,
      open,
      completed: requests.filter((r) => r.status === 'completed').length,
      cancelled: requests.filter((r) => r.status === 'cancelled').length,
    };
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
      const created = normalizeBuyerServiceRequest(raw);
      if (!created) return;
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

  const renderStep = (label: string, shortLabel: string, done: boolean) => (
    <div className="flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-2.5 py-2 sm:min-h-12 sm:px-3">
      {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
      <p className={`text-xs sm:text-sm ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </p>
    </div>
  );

  return (
    <div className="min-h-full bg-background px-3 pb-24 pt-2 sm:bg-gradient-to-b sm:from-background sm:via-background sm:to-muted/20 sm:p-5 sm:pb-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-3 sm:space-y-6">
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:rounded-2xl sm:p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">Services</h1>
              <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                <span className="sm:hidden">Request help · track status</span>
                <span className="hidden sm:inline">Pick a category, confirm location, and submit in under a minute.</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5 text-center text-[10px] tabular-nums sm:grid sm:grid-cols-3 sm:gap-2 sm:text-xs md:min-w-[240px]">
              {(
                [
                  { label: 'Pending', value: requestStats.pending },
                  { label: 'Active', value: requestStats.active },
                  { label: 'Done', value: requestStats.completed },
                ] as const
              ).map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[2.75rem] rounded-md border border-border/70 bg-muted/30 px-2 py-1.5 sm:min-w-0 sm:p-3"
                >
                  <p className="text-muted-foreground">{stat.label}</p>
                  <p className="mt-0.5 text-sm font-semibold sm:mt-1 sm:text-lg">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
          {sessionReady && identityMode !== 'buyer' ? (
            <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
              <Link
                href="/auth?role=buyer&next=%2Fbuyer%2Fservices%3FopenQuick%3D1"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
              <span className="hidden sm:inline"> or create a buyer account to submit requests and track live.</span>
              <span className="sm:hidden"> to submit & track.</span>
            </p>
          ) : null}
        </div>

        {activeServiceRequest ? (
          <Card className="rounded-xl border-border/70 p-3 shadow-sm sm:rounded-2xl sm:p-6 md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn('border text-[10px] sm:text-xs', serviceStatusPresentation(activeServiceRequest.status).badgeClass)}
                  >
                    {serviceStatusPresentation(activeServiceRequest.status).label}
                  </Badge>
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-2xl">{activeServiceRequest.service}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                  {activeServiceRequest.category}
                  <span className="mx-1 text-muted-foreground/50">·</span>
                  {activeServiceRequest.location}
                </p>
              </div>
              <div className="shrink-0 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs sm:rounded-xl sm:p-3 sm:text-sm">
                <p className="font-medium">{activeServiceProvider?.name || 'Provider'}</p>
                <p className="text-muted-foreground">
                  {activeServiceProvider
                    ? `${activeServiceProvider.rating.toFixed(1)}★`
                    : 'Matching…'}
                </p>
              </div>
            </div>

            <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
              {renderStep('Request accepted', 'Accepted', activeServiceRequest.status !== 'pending')}
              {renderStep(
                'Provider heading to location',
                'En route',
                activeServiceRequest.status === 'in_progress' || activeServiceRequest.status === 'completed',
              )}
              {renderStep('Service completed', 'Done', activeServiceRequest.status === 'completed')}
              {renderStep('Payment confirmed', 'Paid', activeServiceRequest.status === 'completed')}
            </div>

            {paymentSummary ? (
              <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-3 sm:mt-5 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                    Payment
                  </p>
                  <p className="text-sm font-bold tabular-nums text-foreground sm:hidden">
                    UGX {paymentSummary.total.toLocaleString()}
                  </p>
                </div>
                <div className="mt-2 hidden gap-2 text-sm sm:grid md:grid-cols-3">
                  <p className="rounded-lg border border-border/60 bg-background px-3 py-2">
                    Service: UGX {paymentSummary.base.toLocaleString()}
                  </p>
                  <p className="rounded-lg border border-border/60 bg-background px-3 py-2">
                    Platform: UGX {paymentSummary.platformFee.toLocaleString()}
                  </p>
                  <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 font-semibold">
                    Total: UGX {paymentSummary.total.toLocaleString()}
                  </p>
                </div>
                <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background/80 p-3 sm:space-y-3 sm:rounded-xl">
                  <p className="text-xs font-medium text-muted-foreground sm:font-semibold sm:uppercase sm:tracking-wide">
                    Checkout contact
                  </p>
                  <p className="hidden text-xs text-muted-foreground sm:block">Used only for Paytota checkout.</p>
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
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {paying ? 'Redirecting…' : 'Pay now'}
                  </button>
                </div>
              </div>
            ) : null}

            {identityMode === 'buyer' ? (
              <div className="mt-4 grid grid-cols-3 gap-1.5 sm:mt-5 sm:gap-2 md:grid-cols-3">
                <Link
                  href="/buyer/orders"
                  className="rounded-lg border border-border bg-background px-2 py-2 text-center text-xs font-medium hover:bg-muted/40 sm:px-3 sm:py-2.5 sm:text-sm"
                >
                  Orders
                </Link>
                <Link
                  href="/buyer/support"
                  className="rounded-lg border border-border bg-background px-2 py-2 text-center text-xs font-medium hover:bg-muted/40 sm:px-3 sm:py-2.5 sm:text-sm"
                >
                  Support
                </Link>
                <Link
                  href="/buyer/addresses"
                  className="rounded-lg border border-border bg-background px-2 py-2 text-center text-xs font-medium hover:bg-muted/40 sm:px-3 sm:py-2.5 sm:text-sm"
                >
                  Locations
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground sm:mt-5 sm:text-sm">
                <Link href="/auth?role=buyer&next=/buyer" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
                <span className="hidden sm:inline"> or create a buyer account to sync requests across devices.</span>
                <span className="sm:hidden"> to sync across devices.</span>
              </p>
            )}
          </Card>
        ) : (
          <Card id="quick-request" className="scroll-mt-24 rounded-xl border-border/70 p-3 shadow-sm sm:rounded-2xl sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight sm:text-lg">New request</h2>
              <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                <Timer className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                2 steps
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-2">
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
                    className={cn(
                      'min-h-[3.25rem] rounded-xl border px-2.5 py-2.5 text-left transition sm:min-h-[4.5rem] sm:px-3 sm:py-3',
                      isActive ? 'border-primary bg-primary/10' : 'border-border/70 bg-background hover:bg-muted/40',
                    )}
                  >
                    <p className="text-xs font-medium leading-snug sm:text-sm">
                      <span className="mr-1" aria-hidden>
                        {category.emoji}
                      </span>
                      {category.title}
                    </p>
                    <p className="mt-1 hidden line-clamp-2 text-xs text-muted-foreground sm:block">{category.useWhen}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground sm:hidden">Tap a category to continue</p>
          </Card>
        )}

        <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm sm:rounded-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-2">
              <History className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" aria-hidden />
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight sm:text-lg">History</h2>
                <p className="hidden text-sm text-muted-foreground sm:block">Newest first · open jobs at the top</p>
              </div>
            </div>
            {identityMode === 'buyer' && customerId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-2.5 sm:h-9 sm:px-3"
                disabled={requestsLoading}
                onClick={() => void loadServiceData(customerId)}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', requestsLoading && 'animate-spin')} aria-hidden />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            ) : null}
          </div>

          <div className="p-3 sm:p-6">
            {sessionReady && identityMode !== 'buyer' ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center sm:py-10">
                <p className="text-sm font-medium text-foreground">Sign in to view history</p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/auth?role=buyer&next=%2Fbuyer%2Fservices">Continue</Link>
                </Button>
              </div>
            ) : requestsLoading && requests.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-border/50 bg-muted/30 p-4 sm:p-5"
                  >
                    <div className="h-4 w-1/3 max-w-[200px] rounded bg-muted" />
                    <div className="mt-3 h-3 w-2/3 max-w-md rounded bg-muted" />
                    <div className="mt-4 h-9 w-28 rounded-lg bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as ServiceHistoryTab)} className="gap-3 sm:gap-4">
                <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:w-auto sm:flex-wrap sm:rounded-xl [&::-webkit-scrollbar]:hidden">
                  {(
                    [
                      { value: 'all' as const, label: 'All', short: 'All' },
                      { value: 'open' as const, label: 'In progress', short: 'Open' },
                      { value: 'completed' as const, label: 'Completed', short: 'Done' },
                      { value: 'cancelled' as const, label: 'Cancelled', short: 'Cancelled' },
                    ] as const
                  ).map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="shrink-0 rounded-md px-2.5 py-1.5 text-xs sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
                    >
                      <span className="sm:hidden">{tab.short}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="ml-1 tabular-nums text-muted-foreground">{historyCounts[tab.value]}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {(['all', 'open', 'completed', 'cancelled'] as const).map((tab) => {
                  const tabItems = buildServiceHistoryList(requests, tab);
                  return (
                  <TabsContent key={tab} value={tab} className="mt-0 outline-none">
                    {tabItems.length === 0 ? (
                      <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-10 text-center sm:py-12">
                        <p className="text-sm font-medium text-foreground">
                          {tab === 'all'
                            ? 'No requests yet'
                            : tab === 'open'
                              ? 'Nothing open'
                              : tab === 'completed'
                                ? 'None completed'
                                : 'None cancelled'}
                        </p>
                        {tab === 'all' ? (
                          <Button asChild variant="outline" className="mt-4" size="sm">
                            <Link href="#quick-request">New request</Link>
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <ul className="space-y-3 p-0">
                        {tabItems.map((request) => {
                          const pres = serviceStatusPresentation(request.status);
                          const when = formatHistoryWhen(request.createdAt);
                          return (
                            <li key={request.id}>
                              <div
                                className={cn(
                                  'group rounded-lg border border-border/70 bg-card/50 transition hover:border-border hover:bg-card',
                                  'border-l-[3px] px-3 py-3 sm:rounded-xl sm:px-4 sm:py-4',
                                  pres.borderClass,
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <Badge
                                        variant="outline"
                                        className={cn('h-5 px-1.5 text-[10px] sm:h-auto sm:px-2 sm:text-xs', pres.badgeClass)}
                                      >
                                        {pres.label}
                                      </Badge>
                                      <time
                                        className="text-[10px] text-muted-foreground sm:text-xs"
                                        dateTime={request.createdAt}
                                        title={when.full}
                                      >
                                        {when.primary}
                                      </time>
                                    </div>
                                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base">
                                      {request.service}
                                    </h3>
                                    <p className="line-clamp-1 text-xs text-muted-foreground" title={request.location}>
                                      {request.category || 'General'}
                                      <span className="text-muted-foreground/60"> · </span>
                                      {request.location}
                                    </p>
                                  </div>
                                  {identityMode === 'buyer' ? (
                                    <Button
                                      asChild
                                      size="sm"
                                      variant="secondary"
                                      className="h-8 shrink-0 gap-0 px-2.5 sm:h-9 sm:gap-1.5 sm:px-3"
                                    >
                                      <Link
                                        href={`/buyer/services/track/${encodeURIComponent(request.id)}`}
                                        aria-label={request.status === 'completed' ? 'View details' : 'Track request'}
                                      >
                                        <span className="hidden sm:inline">
                                          {request.status === 'completed' ? 'Details' : 'Track'}
                                        </span>
                                        <ArrowUpRight className="h-4 w-4 sm:ms-1 sm:h-3.5 sm:w-3.5" aria-hidden />
                                      </Link>
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </div>
        </Card>
      </div>
      {!activeServiceRequest ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <button
            type="button"
            onClick={() => {
              if (!selectedCategory) {
                document.getElementById('quick-request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
              }
              serviceAutofillSuppressed.current = true;
              setSelectedService('');
              setQuickRequestUiStep('service');
              setIsQuickRequestDialogOpen(true);
            }}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {selectedCategory ? 'Continue' : 'Choose category'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
      <BuyerServiceQuickRequestDialog
        open={isQuickRequestDialogOpen}
        onOpenChange={setIsQuickRequestDialogOpen}
        step={quickRequestUiStep}
        onCloseReset={() => {
          serviceAutofillSuppressed.current = false;
          setQuickRequestUiStep('service');
        }}
        onEscapeLocation={goBackToQuickServiceStep}
        selectedCategory={selectedCategory}
        categoryEmoji={selectedCategoryMeta?.emoji}
        categoryHint={selectedCategoryMeta?.useWhen}
        selectedService={selectedService}
        services={suggestedServices}
        serviceSectionRef={serviceSectionRef}
        onSelectService={(service) => {
          serviceAutofillSuppressed.current = false;
          setSelectedService(service);
          setQuickRequestUiStep('location');
        }}
        onBackToService={goBackToQuickServiceStep}
        useDetectedLocation={useDetectedLocation}
        onUseDetectedLocation={setUseDetectedLocation}
        locationStatus={locationStatus}
        locationMessage={locationMessage}
        locationAccuracyLabel={locationAccuracyLabel}
        detectedLocation={detectedLocation}
        manualLocation={manualLocation}
        onManualLocationChange={setManualLocation}
        onRefreshLocation={() => void detectCurrentLocation()}
        canSubmit={canSubmitQuickRequest}
        canPressSubmit={canPressSubmitRequest}
        submitError={submitError}
        identityMode={identityMode}
        onSubmit={handleSubmitRequestIntent}
      />
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
