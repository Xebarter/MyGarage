export type SubscriptionTier = 'platinum' | 'gold' | 'silver' | 'bronze';

export type SubscriptionPlan = {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  currency: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  vehicleLimit: number | null;
  prioritySupport: boolean;
  analyticsAccess: boolean;
  documentStorage: boolean;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'platinum',
    name: 'Platinum',
    tagline: 'Ultimate care for serious drivers and fleets',
    monthlyPrice: 99000,
    currency: 'UGX',
    badge: 'Best value',
    highlight: true,
    vehicleLimit: null,
    prioritySupport: true,
    analyticsAccess: true,
    documentStorage: true,
    features: [
      'Unlimited vehicles in My Vehicles',
      'VIP provider matching & fastest dispatch',
      'Dedicated account support line',
      'Advanced analytics & cost insights',
      'Unlimited document vault with expiry alerts',
      'Family/driver sharing (up to 4 profiles)',
      '10% discount on shop parts',
    ],
  },
  {
    tier: 'gold',
    name: 'Gold',
    tagline: 'Priority service and deeper vehicle insights',
    monthlyPrice: 59000,
    currency: 'UGX',
    vehicleLimit: null,
    prioritySupport: true,
    analyticsAccess: true,
    documentStorage: true,
    features: [
      'Unlimited vehicles',
      'Priority roadside & workshop dispatch',
      'Provider messaging on every request',
      'Maintenance reminders & health dashboard',
      'Document storage per vehicle',
      '5% discount on shop parts',
    ],
  },
  {
    tier: 'silver',
    name: 'Silver',
    tagline: 'Essential tools for everyday vehicle owners',
    monthlyPrice: 29000,
    currency: 'UGX',
    vehicleLimit: 3,
    prioritySupport: false,
    analyticsAccess: false,
    documentStorage: true,
    features: [
      'Up to 3 vehicles',
      'Standard service booking',
      'Maintenance & document expiry reminders',
      'Service history timeline',
      'In-app notifications',
    ],
  },
  {
    tier: 'bronze',
    name: 'Bronze',
    tagline: 'Get started free with core vehicle tracking',
    monthlyPrice: 0,
    currency: 'UGX',
    vehicleLimit: 1,
    prioritySupport: false,
    analyticsAccess: false,
    documentStorage: false,
    features: [
      '1 vehicle in My Vehicles',
      'Basic service requests',
      'Order & service history',
      'Email notifications',
    ],
  },
];

export function getSubscriptionPlan(tier: SubscriptionTier): SubscriptionPlan {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
  if (!plan) throw new Error(`Unknown subscription tier: ${tier}`);
  return plan;
}

export function tierRank(tier: SubscriptionTier): number {
  const order: SubscriptionTier[] = ['bronze', 'silver', 'gold', 'platinum'];
  return order.indexOf(tier);
}

export function formatPlanPrice(plan: SubscriptionPlan): string {
  if (plan.monthlyPrice === 0) return 'Free';
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(plan.monthlyPrice);
}

export const TIER_STYLES: Record<
  SubscriptionTier,
  { gradient: string; border: string; accent: string; ring: string }
> = {
  platinum: {
    gradient: 'from-slate-700 via-slate-600 to-slate-800',
    border: 'border-slate-400/50',
    accent: 'text-slate-100',
    ring: 'ring-slate-400/40',
  },
  gold: {
    gradient: 'from-amber-500 via-yellow-500 to-amber-600',
    border: 'border-amber-400/60',
    accent: 'text-amber-950',
    ring: 'ring-amber-400/50',
  },
  silver: {
    gradient: 'from-zinc-300 via-slate-200 to-zinc-400',
    border: 'border-slate-300/80',
    accent: 'text-slate-800',
    ring: 'ring-slate-300/60',
  },
  bronze: {
    gradient: 'from-orange-700 via-amber-700 to-orange-800',
    border: 'border-orange-500/50',
    accent: 'text-orange-50',
    ring: 'ring-orange-500/40',
  },
};
