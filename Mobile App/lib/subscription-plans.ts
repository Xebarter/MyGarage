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
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'platinum',
    name: 'Platinum',
    tagline: 'Ultimate care for serious drivers',
    monthlyPrice: 99000,
    currency: 'UGX',
    badge: 'Best value',
    highlight: true,
    features: [
      'Unlimited vehicles',
      'VIP provider matching',
      'Dedicated support',
      'Advanced analytics',
      'Document vault + expiry alerts',
      '10% shop discount',
    ],
  },
  {
    tier: 'gold',
    name: 'Gold',
    tagline: 'Priority service & insights',
    monthlyPrice: 59000,
    currency: 'UGX',
    features: [
      'Unlimited vehicles',
      'Priority dispatch',
      'Provider messaging',
      'Maintenance reminders',
      '5% shop discount',
    ],
  },
  {
    tier: 'silver',
    name: 'Silver',
    tagline: 'Essential everyday tools',
    monthlyPrice: 29000,
    currency: 'UGX',
    features: ['Up to 3 vehicles', 'Service booking', 'Document reminders', 'Service history'],
  },
  {
    tier: 'bronze',
    name: 'Bronze',
    tagline: 'Free starter plan',
    monthlyPrice: 0,
    currency: 'UGX',
    features: ['1 vehicle', 'Basic service requests', 'Order history', 'Email notifications'],
  },
];

export const TIER_COLORS: Record<SubscriptionTier, { bg: string; text: string; border: string }> = {
  platinum: { bg: '#334155', text: '#f8fafc', border: '#94a3b8' },
  gold: { bg: '#d97706', text: '#1c1917', border: '#fbbf24' },
  silver: { bg: '#e2e8f0', text: '#1e293b', border: '#cbd5e1' },
  bronze: { bg: '#c2410c', text: '#fff7ed', border: '#fb923c' },
};

export function formatPlanPrice(plan: SubscriptionPlan): string {
  if (plan.monthlyPrice === 0) return 'Free';
  return `UGX ${plan.monthlyPrice.toLocaleString()}`;
}
