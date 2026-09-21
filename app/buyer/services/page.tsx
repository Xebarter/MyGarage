'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BuyerServiceQuickRequestDialog } from '@/components/buyer/buyer-service-quick-request-dialog';
import { GarageVehiclePicker } from '@/components/buyer/garage/vehicle-picker';
import { MobileBuyerServicesBrowse } from '@/components/buyer/mobile-buyer-services-browse';
import { ActiveServiceFocus } from '@/components/buyer/active-service-focus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BUYER_SERVICE_COMPLETE_PENDING_PATH, savePendingBuyerServiceRequest } from '@/lib/buyer-service-pending';
import { cleanServiceDisplayTitle, userServiceCategories } from '@/lib/services-catalog';
import { searchBuyerServicesCatalog } from '@/lib/search/match-catalog-services';
import { serviceCardSurfaceClass, serviceCardTone, SERVICE_EMERGENCY_TONE, serviceEmergencySurfaceClass } from '@/lib/service-card-tones';
import {
  formatServicePriceRangeLabel,
  type ServicePriceRange,
} from '@/lib/format-service-price';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  History,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseMapPoint } from '@/lib/maps/coords';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { persistBuyerLocalIdentity, readStoredBuyerName, readStoredBuyerPhone } from '@/lib/buyer-identity';
import { formatE164Display, isPlaceholderEmail } from '@/lib/phone';
import { isPlaceholderDisplayName } from '@/lib/display-name';
import { authUserFullName, authUserPhone, fetchBuyerCustomer } from '@/lib/auth/save-display-name';

type BuyerServiceRequest = {
  id: string;
  category: string;
  service: string;
  location: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  providerId?: string | null;
  vehicleId?: string | null;
  acceptedAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

type BuyerProviderRating = {
  providerId: string;
  stars: number;
};

type ServiceHistoryTab = 'all' | 'open' | 'completed';

function isUnfulfilledBuyerServiceStatus(status: BuyerServiceRequest['status']): boolean {
  return status === 'expired' || status === 'cancelled';
}

function isRunningBuyerServiceStatus(status: BuyerServiceRequest['status']): boolean {
  return status === 'pending' || status === 'matched' || status === 'in_progress';
}

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
    case 'expired':
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
    case 'expired':
      return {
        label: 'Expired',
        borderClass: 'border-l-orange-500',
        badgeClass: 'border-orange-500/35 bg-orange-500/10 text-orange-950 dark:text-orange-100 font-medium',
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
  let list = requests.filter((r) => !isUnfulfilledBuyerServiceStatus(r.status));
  if (tab === 'open') {
    list = list.filter((r) => r.status === 'pending' || r.status === 'matched' || r.status === 'in_progress');
  } else if (tab === 'completed') {
    list = list.filter((r) => r.status === 'completed');
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
  const allowed: BuyerServiceRequest['status'][] = [
    'pending',
    'matched',
    'in_progress',
    'completed',
    'cancelled',
    'expired',
  ];
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
    vehicleId:
      typeof raw.vehicleId === 'string'
        ? raw.vehicleId
        : typeof raw.vehicle_id === 'string'
          ? raw.vehicle_id
          : null,
  };
}

const PAY_CONTACT_NAME_KEY = 'servicePaymentContactName';
const PAY_CONTACT_EMAIL_KEY = 'servicePaymentContactEmail';
const PAY_CONTACT_PHONE_KEY = 'servicePaymentContactPhone';

function CompletedRequestStrip({
  request,
  index,
  expanded,
  onToggle,
  isBuyer,
}: {
  request: BuyerServiceRequest;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  isBuyer: boolean;
}) {
  const pres = serviceStatusPresentation(request.status);
  const when = formatHistoryWhen(request.completedAt || request.createdAt);
  const panelId = `completed-request-${request.id}`;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border-l-[3px] transition',
        serviceCardSurfaceClass,
        pres.borderClass,
      )}
      style={{ backgroundColor: serviceCardTone(index) }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left sm:px-4"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-foreground">
          {request.service}
        </span>
        <Badge variant="outline" className={cn('h-6 shrink-0 px-2 text-[10px] sm:text-xs', pres.badgeClass)}>
          {pres.label}
        </Badge>
        <time
          className="hidden shrink-0 text-[10px] text-muted-foreground sm:block sm:text-xs"
          dateTime={request.completedAt || request.createdAt}
          title={when.full}
        >
          {when.primary}
        </time>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div id={panelId} className="space-y-3 border-t border-border/50 px-3.5 py-3 sm:px-4">
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {request.category || 'General'}
              {request.location ? (
                <>
                  <span className="text-muted-foreground/50"> · </span>
                  {request.location}
                </>
              ) : null}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">Finished {when.full}</p>
          {isBuyer ? (
            <Button asChild size="sm" variant="outline" className="h-9 gap-1">
              <Link href={`/buyer/services/track/${encodeURIComponent(request.id)}`}>
                View job
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

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
  const [requestsHydrated, setRequestsHydrated] = useState(false);
  const runningServiceRequest = useMemo(
    () => requests.find((item) => isRunningBuyerServiceStatus(item.status)) ?? null,
    [requests],
  );
  const liveServiceHref = runningServiceRequest
    ? `/buyer/services/track/${encodeURIComponent(runningServiceRequest.id)}`
    : '';
  const [historyTab, setHistoryTab] = useState<ServiceHistoryTab>('all');
  const [expandedCompletedId, setExpandedCompletedId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<BuyerProviderRating[]>([]);
  const [identityMode, setIdentityMode] = useState<'buyer' | 'guest'>('guest');
  const [payContactName, setPayContactName] = useState('');
  const [payContactEmail, setPayContactEmail] = useState('');
  const [payContactPhone, setPayContactPhone] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [priceRanges, setPriceRanges] = useState<ServicePriceRange[]>([]);
  const [destinationCoords, setDestinationCoords] = useState<{
    destinationLat: number;
    destinationLng: number;
  } | null>(null);
  const [bookingVehicleId, setBookingVehicleId] = useState('');

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
    if (runningServiceRequest) {
      appliedOpenQuickFromAuth.current = true;
      return;
    }
    if (identityMode === 'buyer' && !sessionReady) return;
    if (identityMode === 'buyer' && !requestsHydrated) return;
    appliedOpenQuickFromAuth.current = true;
    serviceAutofillSuppressed.current = true;
    setSelectedService('');
    setQuickRequestUiStep('service');
    setIsQuickRequestDialogOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('openQuick');
    const q = params.toString();
    router.replace(`${pathname}${q ? `?${q}` : ''}`, { scroll: false });
  }, [searchParams, pathname, router, runningServiceRequest, identityMode, sessionReady, requestsHydrated]);

  useEffect(() => {
    if (appliedDeepLinkSc.current) return;
    if (!sessionReady) return;
    if (identityMode === 'buyer' && !requestsHydrated) return;
    if (runningServiceRequest) return;
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
  }, [searchParams, pathname, router, runningServiceRequest, identityMode, sessionReady, requestsHydrated]);

  useEffect(() => {
    if (!customerId) {
      if (sessionReady) setRequestsHydrated(true);
      return;
    }
    void loadServiceData(customerId);
  }, [customerId, sessionReady]);

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
  const catalogSearch = useMemo(
    () => searchBuyerServicesCatalog(categorySearch, { serviceLimit: 16 }),
    [categorySearch],
  );
  const isCatalogSearching = categorySearch.trim().length >= 2;
  const filteredCategories = catalogSearch.categories.map((row) => row.category);
  const matchedServices = catalogSearch.services;
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
      setDestinationCoords(null);
      setLocationAccuracyLabel('');
      setLocationMessage('Location requires a secure connection (HTTPS or localhost). Please switch to manual location.');
      setUseDetectedLocation(false);
      return;
    }

    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      setDetectedLocation('');
      setDestinationCoords(null);
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
      const point = parseMapPoint(latitude, longitude);
      if (!point) {
        throw new Error('location_unavailable');
      }
      setDetectedLocation(`Current location (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`);
      setDestinationCoords({ destinationLat: point.lat, destinationLng: point.lng });
      setLocationAccuracyLabel(Number.isFinite(accuracy) ? `Approx. accuracy: ${Math.round(accuracy)}m` : '');
      setLocationMessage('Location detected. You can retry for a fresh fix.');
      setLocationStatus('ready');
    } catch (error) {
      const geolocationError = error as GeolocationPositionError | Error;
      setLocationStatus('error');
      setDetectedLocation('');
      setDestinationCoords(null);
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
    let cancelled = false;
    const loadContact = async () => {
      const storedName = (localStorage.getItem(PAY_CONTACT_NAME_KEY) || readStoredBuyerName() || '').trim();
      const storedEmail = (localStorage.getItem(PAY_CONTACT_EMAIL_KEY) || localStorage.getItem('currentBuyerEmail') || '').trim();
      const storedPhone = (localStorage.getItem(PAY_CONTACT_PHONE_KEY) || readStoredBuyerPhone() || '').trim();
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const sessionPhone = user ? authUserPhone(user) : '';
      const customer = user
        ? await fetchBuyerCustomer({
            customerId: (localStorage.getItem('currentBuyerId') || '').trim(),
            email: user.email ?? '',
            phone: sessionPhone || storedPhone,
          })
        : null;
      if (cancelled) return;
      const phone = customer?.phone || sessionPhone || storedPhone;
      const nameRaw = customer?.name || storedName || (user ? authUserFullName(user) : '');
      const name = isPlaceholderDisplayName(nameRaw, { phone, email: customer?.email || user?.email }) ? storedName : nameRaw;
      const email =
        (customer?.email && !isPlaceholderEmail(customer.email) ? customer.email : '') || storedEmail;
      if (name) setPayContactName(name);
      if (email) setPayContactEmail(email);
      if (phone) {
        setPayContactPhone(formatE164Display(phone));
        persistBuyerLocalIdentity({ phone, id: customer?.id, name, email });
      }
    };
    void loadContact();
    return () => {
      cancelled = true;
    };
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
      setRequestsHydrated(true);
    }
  };

  const requestStats = useMemo(() => {
    const pending = requests.filter((item) => item.status === 'pending').length;
    const active = requests.filter((item) => item.status === 'matched' || item.status === 'in_progress').length;
    const completed = requests.filter((item) => item.status === 'completed').length;
    return { pending, active, completed };
  }, [requests]);

  const historyCounts = useMemo(() => {
    const listed = requests.filter((r) => !isUnfulfilledBuyerServiceStatus(r.status));
    const open = listed.filter(
      (r) => r.status === 'pending' || r.status === 'matched' || r.status === 'in_progress',
    ).length;
    return {
      all: listed.length,
      open,
      completed: listed.filter((r) => r.status === 'completed').length,
    };
  }, [requests]);

  useEffect(() => {
    if (!runningServiceRequest || !liveServiceHref) return;
    setIsQuickRequestDialogOpen(false);
    router.replace(liveServiceHref);
  }, [runningServiceRequest, liveServiceHref, router]);

  const completedRequests = useMemo(
    () => requests.filter((item) => item.status === 'completed'),
    [requests],
  );

  useEffect(() => {
    if (runningServiceRequest && isQuickRequestDialogOpen) {
      setIsQuickRequestDialogOpen(false);
    }
  }, [runningServiceRequest, isQuickRequestDialogOpen]);

  useEffect(() => {
    setExpandedCompletedId(null);
  }, [historyTab]);

  const submitRequest = async () => {
    if (submittingRequest) return;
    if (identityMode !== 'buyer' || !selectedService || !resolvedLocation || !customerId) return;
    if (runningServiceRequest) {
      setSubmitError('You already have a service in progress. Finish or cancel it before booking another.');
      setIsQuickRequestDialogOpen(false);
      router.push(`/buyer/services/track/${encodeURIComponent(runningServiceRequest.id)}`);
      return;
    }
    setSubmitError(null);
    setSubmittingRequest(true);
    try {
      let coords: { destinationLat: number; destinationLng: number } | Record<string, never> = {};
      const stored = destinationCoords
        ? parseMapPoint(destinationCoords.destinationLat, destinationCoords.destinationLng)
        : null;
      if (stored) {
        coords = { destinationLat: stored.lat, destinationLng: stored.lng };
      } else if (useDetectedLocation) {
        // Best-effort only — never block submit on a second GPS wait.
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 2500,
              maximumAge: 120000,
            });
          });
          const la = pos.coords.latitude;
          const ln = pos.coords.longitude;
          if (parseMapPoint(la, ln)) {
            coords = { destinationLat: la, destinationLng: ln };
            setDestinationCoords(coords);
          }
        } catch {
          /* address text still sent */
        }
      }

      const contactPhone = payContactPhone.trim();
      const contactName = payContactName.trim();
      if (contactPhone) localStorage.setItem(PAY_CONTACT_PHONE_KEY, contactPhone);
      if (contactName) localStorage.setItem(PAY_CONTACT_NAME_KEY, contactName);
      const response = await fetch('/api/buyer/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          category: selectedCategory,
          categoryId: selectedCategoryMeta?.id,
          service: selectedService,
          location: resolvedLocation,
          ...(contactPhone ? { buyerContactPhone: contactPhone } : {}),
          ...(contactName ? { buyerContactName: contactName } : {}),
          ...(bookingVehicleId ? { vehicleId: bookingVehicleId } : {}),
          ...coords,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string; requestId?: string };
        if (body.code === 'PHONE_REQUIRED') {
          setSubmitError(
            body.error ||
              'Add a mobile number on your profile, then try again.',
          );
        } else if (body.code === 'ACTIVE_REQUEST_EXISTS') {
          setSubmitError(
            body.error ||
              'You already have a service in progress. Finish or cancel it before booking another.',
          );
          setIsQuickRequestDialogOpen(false);
          if (body.requestId) {
            router.push(`/buyer/services/track/${encodeURIComponent(body.requestId)}`);
          }
        } else {
          setSubmitError(body.error || 'Could not submit your request. Try again.');
        }
        return;
      }
      const raw = (await response.json()) as Record<string, unknown>;
      const created = normalizeBuyerServiceRequest(raw);
      if (!created?.id) {
        setSubmitError('Request was created but could not be opened. Check Your requests below.');
        if (customerId) void loadServiceData(customerId);
        return;
      }
      setRequests((current) => [created, ...current]);
      setIsQuickRequestDialogOpen(false);
      router.push(`/buyer/services/track/${encodeURIComponent(created.id)}`);
    } catch (error) {
      console.error('Failed to create buyer service request:', error);
      setSubmitError('Could not submit your request. Check your connection and try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const canPressSubmitRequest = Boolean(selectedService && resolvedLocation && (identityMode !== 'buyer' || customerId));
  const canSubmitQuickRequest =
    canPressSubmitRequest && quickRequestUiStep === 'location' && !submittingRequest;

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
      ...(bookingVehicleId ? { vehicleId: bookingVehicleId } : {}),
    });
    router.push(`/auth?role=buyer&next=${encodeURIComponent(BUYER_SERVICE_COMPLETE_PENDING_PATH)}`);
  };

  const handleSubmitRequestIntent = () => {
    if (submittingRequest) return;
    setSubmitError(null);
    if (!selectedService || !resolvedLocation) return;
    if (identityMode !== 'buyer' || !customerId) {
      goToBuyerSignInForRequest();
      return;
    }
    void submitRequest();
  };

  const openCategoryRequest = (categoryTitle: string) => {
    if (runningServiceRequest) {
      setIsQuickRequestDialogOpen(false);
      router.push(`/buyer/services/track/${encodeURIComponent(runningServiceRequest.id)}`);
      return;
    }
    setSelectedCategory(categoryTitle);
    serviceAutofillSuppressed.current = true;
    setSelectedService('');
    setQuickRequestUiStep('service');
    setIsQuickRequestDialogOpen(true);
  };

  const openServiceRequest = (categoryTitle: string, serviceName: string) => {
    if (runningServiceRequest) {
      setIsQuickRequestDialogOpen(false);
      router.push(`/buyer/services/track/${encodeURIComponent(runningServiceRequest.id)}`);
      return;
    }
    serviceAutofillSuppressed.current = false;
    setSelectedCategory(categoryTitle);
    setSelectedService(serviceName);
    setQuickRequestUiStep('location');
    setIsQuickRequestDialogOpen(true);
  };

  const requestStatCards = [
    { label: 'Pending', value: requestStats.pending, icon: Clock3, hint: 'Awaiting match' },
    { label: 'Active', value: requestStats.active, icon: Wrench, hint: 'In progress' },
    { label: 'Completed', value: requestStats.completed, icon: CheckCircle2, hint: 'Finished' },
  ] as const;

  if (identityMode === 'buyer' && runningServiceRequest) {
    return (
      <ActiveServiceFocus
        request={runningServiceRequest}
        href={liveServiceHref}
      />
    );
  }

  if (!sessionReady || (identityMode === 'buyer' && !requestsHydrated)) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading services" />
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <MobileBuyerServicesBrowse
          activeRequest={
            runningServiceRequest
              ? {
                  id: runningServiceRequest.id,
                  service: runningServiceRequest.service,
                  statusLabel: serviceStatusPresentation(runningServiceRequest.status).label,
                }
              : null
          }
          pastJobs={completedRequests.map((request) => {
            const when = formatHistoryWhen(request.completedAt || request.createdAt);
            return {
              id: request.id,
              service: request.service,
              category: request.category,
              location: request.location,
              whenLabel: when.primary,
              whenFull: when.full,
            };
          })}
          expandedJobId={expandedCompletedId}
          onToggleJob={(id) =>
            setExpandedCompletedId((current) => (current === id ? null : id))
          }
          onSelectService={(categoryTitle, serviceName) => {
            if (runningServiceRequest) {
              router.push(`/buyer/services/track/${encodeURIComponent(runningServiceRequest.id)}`);
              return;
            }
            serviceAutofillSuppressed.current = false;
            setSelectedCategory(categoryTitle);
            setSelectedService(serviceName);
            setQuickRequestUiStep('location');
            setIsQuickRequestDialogOpen(true);
          }}
        />
      </div>

      <div className="hidden min-h-full bg-gradient-to-b from-background via-background to-muted/25 px-5 pb-8 pt-3 md:block md:p-8">
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
                {requestStatCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className={cn(
                        'min-w-[6.5rem] shrink-0 snap-start rounded-xl p-3 sm:min-w-0',
                        serviceCardSurfaceClass,
                      )}
                      style={{ backgroundColor: serviceCardTone(index) }}
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

        {runningServiceRequest ? (
          <Link
            href={`/buyer/services/track/${encodeURIComponent(runningServiceRequest.id)}`}
            className={cn(
              "flex items-center gap-3 rounded-xl border-l-[3px] px-3.5 py-2.5 transition hover:brightness-[0.98] sm:px-4",
              serviceCardSurfaceClass,
              serviceStatusPresentation(runningServiceRequest.status).borderClass,
            )}
            style={{ backgroundColor: serviceCardTone(0) }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 px-2 text-[10px] sm:text-xs",
                    serviceStatusPresentation(runningServiceRequest.status).badgeClass,
                  )}
                >
                  {serviceStatusPresentation(runningServiceRequest.status).label}
                </Badge>
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Live</span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-foreground sm:text-base">
                {runningServiceRequest.service}
              </p>
            </div>
            <span className="hidden shrink-0 text-sm font-medium text-foreground sm:inline">Track</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ) : null}

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
                    {runningServiceRequest ? (
                      <>
                        Only one service can run at a time.{' '}
                        <Link
                          href={`/buyer/services/track/${encodeURIComponent(runningServiceRequest.id)}`}
                          className="font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          Open current request
                        </Link>
                      </>
                    ) : (
                      'Choose a category below.'
                    )}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary sm:text-xs">
                  2 steps
                </span>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search towing, oil change, battery, wash…"
                  className="min-h-11 rounded-xl border-border/80 bg-background pl-9 pr-9 text-sm shadow-sm"
                  aria-label="Search services and categories"
                  autoComplete="off"
                  spellCheck={false}
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
              {isCatalogSearching ? (
                <p className="mt-2.5 text-xs text-muted-foreground" aria-live="polite">
                  {matchedServices.length === 0 && filteredCategories.length === 0
                    ? 'No matches'
                    : [
                        matchedServices.length > 0
                          ? `${matchedServices.length} ${matchedServices.length === 1 ? 'service' : 'services'}`
                          : null,
                        filteredCategories.length > 0
                          ? `${filteredCategories.length} ${filteredCategories.length === 1 ? 'category' : 'categories'}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                  {categorySearch.trim() ? ` for “${categorySearch.trim()}”` : ''}
                </p>
              ) : null}
            </div>

            <div className="space-y-5 p-3 sm:p-4">
              {isCatalogSearching && matchedServices.length === 0 && filteredCategories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-10 text-center">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/70" aria-hidden />
                  <p className="mt-3 text-sm font-semibold text-foreground">No services match your search</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try another keyword — towing, tyre, oil, wash, tracker…
                  </p>
                  <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setCategorySearch('')}>
                    Clear search
                  </Button>
                </div>
              ) : (
                <>
                  {isCatalogSearching && matchedServices.length > 0 ? (
                    <div>
                      <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Matching services
                        </h3>
                        <span className="text-[11px] text-muted-foreground">{matchedServices.length}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {matchedServices.map((hit, index) => (
                          <li key={hit.id}>
                            <button
                              type="button"
                              onClick={() => openServiceRequest(hit.categoryTitle, hit.name)}
                              className={cn(
                                'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition active:scale-[0.99]',
                                serviceCardSurfaceClass,
                              )}
                              style={{ backgroundColor: serviceCardTone(index) }}
                            >
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/55 text-lg"
                                aria-hidden
                              >
                                {hit.emoji}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-foreground">
                                  {hit.name}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                  {cleanServiceDisplayTitle(hit.categoryTitle)}
                                </span>
                              </span>
                              <ChevronRight
                                className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
                                aria-hidden
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {filteredCategories.length > 0 ? (
                    <div>
                      {isCatalogSearching ? (
                        <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Categories
                          </h3>
                          <span className="text-[11px] text-muted-foreground">{filteredCategories.length}</span>
                        </div>
                      ) : null}
                      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                        {filteredCategories.map((category, index) => {
                          const isActive = selectedCategory === category.title;
                          const isEmergency = category.priority === 'urgent';
                          const matchMeta = catalogSearch.categories[index];
                          return (
                            <li key={category.id}>
                              <button
                                type="button"
                                onClick={() => openCategoryRequest(category.title)}
                                className={cn(
                                  'group flex h-full min-h-[7.5rem] w-full flex-col gap-2 rounded-xl p-2.5 text-left transition active:scale-[0.99] sm:min-h-[4.25rem] sm:flex-row sm:items-center sm:gap-3 sm:p-3',
                                  isEmergency ? serviceEmergencySurfaceClass : serviceCardSurfaceClass,
                                  isActive && 'ring-2 ring-primary/35',
                                )}
                                style={{
                                  backgroundColor: isEmergency ? SERVICE_EMERGENCY_TONE : serviceCardTone(index),
                                }}
                              >
                                <span
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/50 text-lg sm:h-11 sm:w-11 sm:text-xl"
                                  aria-hidden
                                >
                                  {category.emoji}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block line-clamp-3 text-xs font-semibold leading-snug text-foreground sm:line-clamp-2 sm:text-sm">
                                    {cleanServiceDisplayTitle(category.title)}
                                  </span>
                                  <span className="mt-0.5 block line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:line-clamp-1 sm:text-xs">
                                    {isCatalogSearching && matchMeta?.matchingServiceCount
                                      ? `${matchMeta.matchingServiceCount} matching ${matchMeta.matchingServiceCount === 1 ? 'service' : 'services'}`
                                      : category.useWhen}
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
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>

        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <History className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight sm:text-lg">Your requests</h2>
                <p className="hidden text-xs text-muted-foreground sm:block">Open jobs first · completed stay collapsed until you open them</p>
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

                {(['all', 'open', 'completed'] as const).map((tab) => {
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
                                : 'No completed jobs'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            {tab === 'all' ? 'Book your first service above — it only takes a minute.' : 'Try another filter.'}
                          </p>
                          {tab === 'all' && !runningServiceRequest ? (
                            <Button asChild variant="outline" className="mt-4 min-h-11" size="sm">
                              <Link href="#quick-request">Browse categories</Link>
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <ul className="space-y-2 p-0">
                          {tabItems.map((request, index) => {
                            if (request.status === 'completed') {
                              return (
                                <li key={request.id}>
                                  <CompletedRequestStrip
                                    request={request}
                                    index={index}
                                    expanded={expandedCompletedId === request.id}
                                    onToggle={() =>
                                      setExpandedCompletedId((current) =>
                                        current === request.id ? null : request.id,
                                      )
                                    }
                                    isBuyer={identityMode === 'buyer'}
                                  />
                                </li>
                              );
                            }
                            const pres = serviceStatusPresentation(request.status);
                            const when = formatHistoryWhen(request.createdAt);
                            return (
                              <li key={request.id}>
                                <div
                                  className={cn(
                                    'group rounded-xl border-l-[3px] px-3.5 py-2.5 transition active:scale-[0.995] sm:px-4',
                                    serviceCardSurfaceClass,
                                    pres.borderClass,
                                  )}
                                  style={{ backgroundColor: serviceCardTone(index) }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="min-w-0 flex-1">
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
                                      <h3 className="mt-1 truncate text-sm font-semibold leading-snug text-foreground sm:text-base">
                                        {request.service}
                                      </h3>
                                    </div>
                                    {identityMode === 'buyer' ? (
                                      <Button
                                        asChild
                                        size="sm"
                                        className="h-9 shrink-0 gap-1 px-3"
                                      >
                                        <Link
                                          href={`/buyer/services/track/${encodeURIComponent(request.id)}`}
                                          aria-label="Track request"
                                        >
                                          <span>Track</span>
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
      </div>

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
        categoryUrgent={selectedCategoryMeta?.priority === 'urgent'}
        selectedService={selectedService}
        services={suggestedServices}
        servicePriceLabels={servicePriceLabels}
        serviceSectionRef={serviceSectionRef}
        onSelectService={(service) => {
          serviceAutofillSuppressed.current = false;
          setSelectedService(service);
          setQuickRequestUiStep('location');
        }}
        onBackToService={() => {
          // On phones, category pick lives outside the dialog (app-style).
          if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
            setIsQuickRequestDialogOpen(false);
            setQuickRequestUiStep('service');
            return;
          }
          goBackToQuickServiceStep();
        }}
        useDetectedLocation={useDetectedLocation}
        onUseDetectedLocation={(value) => {
          setUseDetectedLocation(value);
          if (!value) setDestinationCoords(null);
        }}
        locationStatus={locationStatus}
        locationMessage={locationMessage}
        locationAccuracyLabel={locationAccuracyLabel}
        detectedLocation={detectedLocation}
        manualLocation={manualLocation}
        onManualLocationChange={(value) => {
          setManualLocation(value);
          setDestinationCoords(null);
        }}
        onManualPlaceSelect={(place) => {
          setManualLocation(place.label);
          const point = parseMapPoint(place.lat, place.lng);
          if (point) {
            setDestinationCoords({ destinationLat: point.lat, destinationLng: point.lng });
          }
        }}
        onRefreshLocation={() => void detectCurrentLocation()}
        canSubmit={canSubmitQuickRequest}
        canPressSubmit={canPressSubmitRequest}
        submitting={submittingRequest}
        submitError={submitError}
        identityMode={identityMode}
        onSubmit={handleSubmitRequestIntent}
        vehiclePicker={
          identityMode === 'buyer' && customerId ? (
            <GarageVehiclePicker customerId={customerId} value={bookingVehicleId} onChange={setBookingVehicleId} />
          ) : null
        }
        contactPhone={payContactPhone}
        onContactPhoneChange={setPayContactPhone}
      />
    </>
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
