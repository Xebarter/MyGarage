'use client';

import { useState } from 'react';
import { Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  SUBSCRIPTION_PLANS,
  TIER_STYLES,
  formatPlanPrice,
  tierRank,
  type SubscriptionPlan,
  type SubscriptionTier,
} from '@/lib/subscription-plans';

type ActiveSubscription = {
  planTier: SubscriptionTier;
  status: string;
  currentPeriodEnd?: string | Date | null;
  startedAt?: string | Date | null;
} | null;

type Props = {
  customerId: string;
  customerPhone?: string;
  activeSubscription: ActiveSubscription;
  onChanged: () => void | Promise<void>;
};

export function SubscriptionPlansGrid({ customerId, customerPhone, activeSubscription, onChanged }: Props) {
  const [subscribing, setSubscribing] = useState<SubscriptionTier | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTier = activeSubscription?.status === 'active' ? activeSubscription.planTier : null;

  const subscribe = async (tier: SubscriptionTier) => {
    setSubscribing(tier);
    setError(null);
    try {
      const res = await fetch('/api/buyer/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, planTier: tier, customerPhone }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Subscription failed');

      if (body.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel your current membership? Benefits remain until the end of the billing period.')) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/buyer/subscriptions?customerId=${encodeURIComponent(customerId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Cancel failed');
      }
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {activeSubscription?.status === 'active' ? (
        <Card className="border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Current membership</p>
              <p className="text-xl font-bold capitalize">
                {activeSubscription.planTier}
                <Badge className="ml-2 capitalize">{activeSubscription.status}</Badge>
              </p>
              {activeSubscription.currentPeriodEnd ? (
                <p className="text-sm text-muted-foreground">
                  Renews {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              ) : null}
            </div>
            <Button variant="outline" onClick={() => void cancel()} disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel membership'}
            </Button>
          </div>
        </Card>
      ) : activeSubscription?.status === 'pending' ? (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4">
          <p className="font-medium text-amber-800 dark:text-amber-200">Payment pending</p>
          <p className="text-sm text-muted-foreground">
            Complete checkout to activate your {activeSubscription.planTier} membership.
          </p>
        </Card>
      ) : (
        <Card className="border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            Choose a membership to unlock more vehicles, priority service, and premium features.
          </p>
        </Card>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            isActive={activeTier === plan.tier}
            isUpgrade={activeTier ? tierRank(plan.tier) > tierRank(activeTier) : true}
            loading={subscribing === plan.tier}
            disabled={Boolean(subscribing) || cancelling}
            onSelect={() => void subscribe(plan.tier)}
          />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  isActive,
  isUpgrade,
  loading,
  disabled,
  onSelect,
}: {
  plan: SubscriptionPlan;
  isActive: boolean;
  isUpgrade: boolean;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const styles = TIER_STYLES[plan.tier];

  return (
    <Card
      className={cn(
        'relative flex flex-col overflow-hidden border-2 transition-shadow hover:shadow-lg',
        styles.border,
        plan.highlight && 'ring-2',
        plan.highlight && styles.ring,
        isActive && 'shadow-md',
      )}>
      <div className={cn('bg-gradient-to-br px-4 py-5', styles.gradient)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {plan.tier === 'platinum' ? <Crown className={cn('h-5 w-5', styles.accent)} /> : null}
              <h3 className={cn('text-xl font-bold', styles.accent)}>{plan.name}</h3>
            </div>
            <p className={cn('mt-1 text-sm opacity-90', styles.accent)}>{plan.tagline}</p>
          </div>
          {plan.badge ? (
            <Badge className="bg-white/20 text-white backdrop-blur">{plan.badge}</Badge>
          ) : null}
        </div>
        <p className={cn('mt-4 text-3xl font-extrabold tracking-tight', styles.accent)}>
          {formatPlanPrice(plan)}
          {plan.monthlyPrice > 0 ? (
            <span className="text-sm font-medium opacity-80"> /mo</span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <ul className="mb-5 flex-1 space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={plan.highlight ? 'default' : 'outline'}
          disabled={disabled || isActive}
          onClick={onSelect}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isActive ? (
            'Current plan'
          ) : isUpgrade ? (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Subscribe to {plan.name}
            </>
          ) : (
            `Switch to ${plan.name}`
          )}
        </Button>
      </div>
    </Card>
  );
}
