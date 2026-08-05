'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BuyerServiceQuickRequestDialog } from '@/components/buyer/buyer-service-quick-request-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BUYER_SERVICE_COMPLETE_PENDING_PATH, savePendingBuyerServiceRequest } from '@/lib/buyer-service-pending';
import { userServiceCategories } from '@/lib/services-catalog';
import {
  formatServicePriceRangeLabel,
  type ServicePriceRange,
} from '@/lib/format-service-price';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  History,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Wrench,
  X,
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

const CATEGORY_CARD_ACCENTS = [
  { ring: 'ring-rose-500/20', icon: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  { ring: 'ring-sky-500/20', icon: 'bg-sky-500/10 text-sky-800 dark:text-sky-300' },
  { ring: 'ring-emerald-500/20', icon: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400' },
  { ring: 'ring-amber-500/20', icon: 'bg-amber-500/10 text-amber-900 dark:text-amber-400' },
  { ring: 'ring-violet-500/20', icon: 'bg-violet-500/10 text-violet-800 dark:text-violet-300' },
  { ring: 'ring-teal-500/20', icon: 'bg-teal-500/10 text-teal-800 dark:text-teal-300' },
] as const;

function ServiceProgressTimeline({ status }: { status: BuyerServiceRequest['status'] }) {
  const steps = [
    { id: 'accepted', label: 'Request accepted', short: 'Accepted', done: status !== 'pending' },
    {
      id: 'enroute',
      label: 'Provider en route',
      short: 'En route',
      done: status === 'in_progress' || status === 'completed',
    },
    { id: 'done', label: 'Service completed', short: 'Completed', done: status === 'completed' },
    { id: 'paid', label: 'Payment confirmed', short: 'Paid', done: status === 'completed' },
  ] as const;

  return (
    <ol className="grid gap-3 sm:grid-cols-2 sm:gap-2 xl:grid-cols-4">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={cn(
            'relative flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 p-3',
            step.done && 'border-primary/25 bg-primary/[0.04]',
          )}
        >
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
              step.done
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                : 'bg-muted text-muted-foreground ring-1 ring-border/80',
            )}
            aria-hidden
          >
            {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn('text-sm font-semibold leading-snug', step.done ? 'text-foreground' : 'text-muted-foreground')}>
              <span className="sm:hidden">{step.short}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

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
  const [selectedService, setSelectedService] = useState(userServiceCategories[0]?.services[0]?.name || '');
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
  const [categorySearch, setCategorySearch] = useState('');
  const [priceRanges, setPriceRanges] = useState<ServicePriceRange[]>([]);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    const cat = userServiceCategories.find((c) => c.title === selectedCategory);
    const categoryId = cat?.id;
    if (!categoryId) {
      setPriceRanges([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/services/price-ranges?categoryId=${encodeURIComponent(categoryId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { ranges?: ServicePriceRange[] };
        if (!cancelled) setPriceRanges(Array.isArray(data.ranges) ? data.ranges : []);
      } catch {
        if (!cancelled) setPriceRanges([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

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
          const exact = cat.services.find((s) => s.name === ss);
          const ci = cat.services.find((s) => s.name.toLowerCase() === ss.toLowerCase());
          serviceAutofillSuppressed.current = false;
          setSelectedService(exact?.name || ci?.name || cat.services[0]?.name || '');
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
          setSelectedService(cat.services[0]?.name || '');
        }
        return;
      }
    }

    if (ss) {
      for (const c of userServiceCategories) {
        const exact = c.services.find((s) => s.name === ss);
        const ci = c.services.find((s) => s.name.toLowerCase() === ss.toLowerCase());
        if (exact || ci) {
          appliedDeepLinkSc.current = true;
          setSelectedCategory(c.title);
          serviceAutofillSuppressed.current = false;
          setSelectedService(exact?.name || ci?.name || '');
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

  const suggestedServices = useMemo(
    () => (selectedCategoryMeta?.services || []).map((s) => s.name),
    [selectedCategoryMeta],
  );
  const servicePriceLabels = useMemo(() => {
    const byName = new Map(priceRanges.map((r) => [r.serviceName, r] as const));
    const labels: Record<string, string> = {};
    for (const name of suggestedServices) {
      labels[name] = formatServicePriceRangeLabel(byName.get(name));
    }
    return labels;
  }, [priceRanges, suggestedServices]);
  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return userServiceCategories;
    return userServiceCategories.filter(
      (category) =>
        category.title.toLowerCase().includes(query) ||
        category.useWhen.toLowerCase().includes(query) ||
        category.services.some((service) => service.name.toLowerCase().includes(query)),
    );
  }, [categorySearch]);
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
    const names = selectedCategoryMeta.services.map((s) => s.name);
    if (!names.includes(selectedService)) {
      setSelectedService(names[0] || '');
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

  const openCategoryRequest = (categoryTitle: string) => {
    setSelectedCategory(categoryTitle);
    serviceAutofillSuppressed.current = true;
    setSelectedService('');
    setQuickRequestUiStep('service');
    setIsQuickRequestDialogOpen(true);
  };

  const openQuickRequestFlow = () => {
    if (!selectedCategory) {
      document.getElementById('quick-request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    serviceAutofillSuppressed.current = true;
    setSelectedService('');
    setQuickRequestUiStep('service');
    setIsQuickRequestDialogOpen(true);
  };

  const requestStatCards = [
    { label: 'Pending', value: requestStats.pending, icon: Clock3, hint: 'Awaiting match' },
    { label: 'Active', value: requestStats.active, icon: Wrench, hint: 'In progress' },
    { label: 'Completed', value: requestStats.completed, icon: CheckCircle2, hint: 'Finished' },
  ] as const;

  return (
    <div className="min-h-full bg-background px-3 pb-[max(5.75rem,env(safe-area-inset-bottom))] pt-1 sm:bg-gradient-to-b sm:from-background sm:via-background sm:to-muted/25 sm:px-5 sm:pb-8 sm:pt-3 md:p-8">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <header className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-card to-card p-4 shadow-sm ring-1 ring-black/[0.03] dark:from-primary/20 dark:ring-white/[0.04] sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl"
                aria-hidden
              >
                <Wrench className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary sm:text-xs">Services</p>
                <h1 className="mt-0.5 text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl md:text-3xl">
                  Book automotive help
                </h1>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Pick a category and location.
                </p>
                {sessionReady && identityMode !== 'buyer' ? (
                  <p className="mt-2.5 text-xs text-muted-foreground sm:text-sm">
                    <Link
                      href="/auth?role=buyer&next=%2Fbuyer%2Fservices%3FopenQuick%3D1"
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Sign in
                    </Link>
                    <span> to track requests.</span>
                  </p>
                ) : null}
              </div>
            </div>

            {identityMode === 'buyer' ? (
              <div
                className={cn(
                  '-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-0.5',
                  'snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                  'sm:mx-0 sm:grid sm:min-w-[280px] sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:px-0',
                )}
              >
                {requestStatCards.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="min-w-[6.5rem] shrink-0 snap-start rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03] sm:min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      </div>
                      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{stat.value}</p>
                      <p className="mt-0.5 hidden text-[10px] text-muted-foreground sm:block">{stat.hint}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </header>

        {activeServiceRequest ? (
          <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]">
            <div className="border-b border-border/60 bg-muted/20 px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      'border text-[10px] sm:text-xs',
                      serviceStatusPresentation(activeServiceRequest.status).badgeClass,
                    )}
                  >
                    {serviceStatusPresentation(activeServiceRequest.status).label}
                  </Badge>
                  <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-2xl">
                    {activeServiceRequest.service}
                  </h2>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground sm:text-sm">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="line-clamp-2">
                      {activeServiceRequest.category}
                      <span className="text-muted-foreground/50"> · </span>
                      {activeServiceRequest.location}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-xs shadow-sm sm:text-sm">
                  <p className="font-semibold text-foreground">{activeServiceProvider?.name || 'Matching provider'}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {activeServiceProvider ? `${activeServiceProvider.rating.toFixed(1)}★ rating` : 'We will notify you shortly'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress</p>
                <ServiceProgressTimeline status={activeServiceRequest.status} />
              </div>

              {paymentSummary ? (
                <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CreditCard className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      Payment summary
                    </p>
                    <p className="text-base font-bold tabular-nums text-foreground">
                      UGX {paymentSummary.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3 sm:text-sm">
                    <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                      <p className="text-muted-foreground">Service</p>
                      <p className="mt-0.5 font-semibold tabular-nums">UGX {paymentSummary.base.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                      <p className="text-muted-foreground">Platform fee</p>
                      <p className="mt-0.5 font-semibold tabular-nums">UGX {paymentSummary.platformFee.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                      <p className="text-primary/80">Total due</p>
                      <p className="mt-0.5 font-bold tabular-nums text-foreground">
                        UGX {paymentSummary.total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background/90 p-3.5 sm:p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checkout contact</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        value={payContactName}
                        onChange={(e) => setPayContactName(e.target.value)}
                        onBlur={persistPayContact}
                        placeholder="Full name"
                        className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        autoComplete="name"
                      />
                      <input
                        type="email"
                        value={payContactEmail}
                        onChange={(e) => setPayContactEmail(e.target.value)}
                        onBlur={persistPayContact}
                        placeholder="Email"
                        className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        autoComplete="email"
                      />
                      <input
                        type="tel"
                        value={payContactPhone}
                        onChange={(e) => setPayContactPhone(e.target.value)}
                        onBlur={persistPayContact}
                        placeholder="Mobile (07… or 256…)"
                        className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={payForActiveService}
                    disabled={paying || !canPayForService}
                    className="mt-4 min-h-11 w-full sm:w-auto"
                  >
                    {paying ? 'Redirecting to checkout…' : 'Pay now'}
                  </Button>
                </div>
              ) : null}

              {identityMode === 'buyer' ? (
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { href: '/buyer/orders', label: 'Orders' },
                      { href: '/buyer/support', label: 'Support' },
                      { href: '/buyer/addresses', label: 'Locations' },
                    ] as const
                  ).map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex min-h-11 items-center justify-center rounded-xl border border-border/70 bg-background px-2 text-center text-xs font-medium transition hover:bg-muted/40 sm:text-sm"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground sm:text-sm">
                  <Link href="/auth?role=buyer&next=/buyer" className="font-semibold text-primary underline-offset-4 hover:underline">
                    Sign in
                  </Link>
                  <span className="hidden sm:inline"> to sync requests across devices.</span>
                  <span className="sm:hidden"> to sync across devices.</span>
                </p>
              )}
            </div>
          </Card>
        ) : (
          <section
            id="quick-request"
            className="scroll-mt-24 rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]"
            aria-labelledby="new-request-heading"
          >
            <div className="border-b border-border/60 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="new-request-heading" className="text-base font-bold tracking-tight sm:text-lg">
                    What do you need?
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Choose a category below.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary sm:text-xs">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  2 steps
                </span>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search services (e.g. towing, oil change…)"
                  className="min-h-11 rounded-xl border-border/80 bg-background pl-9 pr-9 text-sm"
                  aria-label="Search service categories"
                />
                {categorySearch ? (
                  <button
                    type="button"
                    onClick={() => setCategorySearch('')}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {filteredCategories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">No categories match your search</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setCategorySearch('')}>
                    Clear search
                  </Button>
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                  {filteredCategories.map((category, index) => {
                    const isActive = selectedCategory === category.title;
                    const accent = CATEGORY_CARD_ACCENTS[index % CATEGORY_CARD_ACCENTS.length];
                    return (
                      <li key={category.id}>
                        <button
                          type="button"
                          onClick={() => openCategoryRequest(category.title)}
                          className={cn(
                            'group flex h-full min-h-[7.5rem] w-full flex-col gap-2 rounded-xl border p-2.5 text-left transition active:scale-[0.99] sm:min-h-[4.25rem] sm:flex-row sm:items-center sm:gap-3 sm:p-3',
                            'ring-1 ring-transparent',
                            isActive
                              ? 'border-primary bg-primary/[0.06] ring-primary/20'
                              : cn('border-border/70 bg-background hover:border-border hover:bg-muted/30', accent.ring),
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:h-11 sm:w-11 sm:text-xl',
                              accent.icon,
                            )}
                            aria-hidden
                          >
                            {category.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block line-clamp-3 text-xs font-semibold leading-snug text-foreground sm:line-clamp-2 sm:text-sm">
                              {category.title}
                            </span>
                            <span className="mt-0.5 block line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:line-clamp-1 sm:text-xs">
                              {category.useWhen}
                            </span>
                          </span>
                          <ChevronRight
                            className="hidden h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground sm:block"
                            aria-hidden
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}

        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <History className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight sm:text-lg">Your requests</h2>
                <p className="hidden text-xs text-muted-foreground sm:block">Open jobs appear first · tap to track live</p>
              </div>
            </div>
            {identityMode === 'buyer' && customerId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5"
                disabled={requestsLoading}
                onClick={() => void loadServiceData(customerId)}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', requestsLoading && 'animate-spin')} aria-hidden />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            ) : null}
          </div>

          <div className="p-3 sm:p-5">
            {sessionReady && identityMode !== 'buyer' ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-10 text-center sm:py-12">
                <p className="text-sm font-semibold text-foreground">Sign in to view your request history</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Track providers, payments, and past jobs in one place.</p>
                <Button asChild className="mt-4 min-h-11" size="sm">
                  <Link href="/auth?role=buyer&next=%2Fbuyer%2Fservices">Continue with account</Link>
                </Button>
              </div>
            ) : requestsLoading && requests.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-border/50 bg-muted/25 p-4 sm:p-5">
                    <div className="h-4 w-1/3 max-w-[200px] rounded bg-muted" />
                    <div className="mt-3 h-3 w-2/3 max-w-md rounded bg-muted" />
                    <div className="mt-4 h-10 w-32 rounded-lg bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as ServiceHistoryTab)} className="gap-3 sm:gap-4">
                <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:w-auto sm:flex-wrap [&::-webkit-scrollbar]:hidden">
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
                      className="shrink-0 rounded-lg px-3 py-2 text-xs data-[state=active]:shadow-sm sm:text-sm"
                    >
                      <span className="sm:hidden">{tab.short}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="ml-1.5 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground sm:text-xs">
                        {historyCounts[tab.value]}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {(['all', 'open', 'completed', 'cancelled'] as const).map((tab) => {
                  const tabItems = buildServiceHistoryList(requests, tab);
                  return (
                    <TabsContent key={tab} value={tab} className="mt-0 outline-none">
                      {tabItems.length === 0 ? (
                        <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-12 text-center">
                          <p className="text-sm font-semibold text-foreground">
                            {tab === 'all'
                              ? 'No requests yet'
                              : tab === 'open'
                                ? 'Nothing in progress'
                                : tab === 'completed'
                                  ? 'No completed jobs'
                                  : 'No cancelled requests'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            {tab === 'all' ? 'Book your first service above — it only takes a minute.' : 'Try another filter.'}
                          </p>
                          {tab === 'all' && !activeServiceRequest ? (
                            <Button asChild variant="outline" className="mt-4 min-h-11" size="sm">
                              <Link href="#quick-request">Browse categories</Link>
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <ul className="space-y-2.5 p-0">
                          {tabItems.map((request) => {
                            const pres = serviceStatusPresentation(request.status);
                            const when = formatHistoryWhen(request.createdAt);
                            return (
                              <li key={request.id}>
                                <div
                                  className={cn(
                                    'group rounded-xl border border-border/70 bg-card transition active:scale-[0.995]',
                                    'border-l-[3px] p-3.5 sm:p-4',
                                    pres.borderClass,
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={cn('h-6 px-2 text-[10px] sm:text-xs', pres.badgeClass)}
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
                                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
                                        {request.service}
                                      </h3>
                                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground" title={request.location}>
                                        {request.category || 'General'}
                                        <span className="text-muted-foreground/50"> · </span>
                                        {request.location}
                                      </p>
                                    </div>
                                    {identityMode === 'buyer' ? (
                                      <Button
                                        asChild
                                        size="sm"
                                        variant={request.status === 'completed' ? 'outline' : 'default'}
                                        className="h-10 shrink-0 gap-1 px-3"
                                      >
                                        <Link
                                          href={`/buyer/services/track/${encodeURIComponent(request.id)}`}
                                          aria-label={request.status === 'completed' ? 'View details' : 'Track request'}
                                        >
                                          <span>{request.status === 'completed' ? 'Details' : 'Track'}</span>
                                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
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
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-md sm:hidden">
          <button
            type="button"
            onClick={openQuickRequestFlow}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.99] hover:bg-primary/90"
          >
            <Wrench className="h-4 w-4" aria-hidden />
            {selectedCategory ? 'Continue request' : 'Request a service'}
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
        servicePriceLabels={servicePriceLabels}
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
        <div className="min-h-[50vh] bg-background px-3 py-8 sm:p-8">
          <div className="mx-auto max-w-6xl space-y-5">
            <div className="h-36 animate-pulse rounded-2xl bg-muted/50" />
            <div className="h-64 animate-pulse rounded-2xl bg-muted/40" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted/30" />
          </div>
        </div>
      }
    >
      <BuyerServicesPageInner />
    </Suspense>
  );
}
