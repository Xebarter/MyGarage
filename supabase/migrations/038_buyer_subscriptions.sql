-- Buyer membership subscriptions: Platinum, Gold, Silver, Bronze.

-- Widen checkout_type to include 'subscription'. Existing rows may contain
-- unexpected values (typos, whitespace, legacy data) — normalize before re-validating.
update public.checkout_sessions
set checkout_type = case
  when trim(lower(checkout_type)) in ('product', 'service', 'subscription') then trim(lower(checkout_type))
  when coalesce(metadata->>'subscription_plan', metadata->>'subscription_id', '') <> '' then 'subscription'
  when coalesce(metadata->>'service_request_id', '') <> '' then 'service'
  else 'product'
end
where checkout_type is null
   or trim(checkout_type) = ''
   or trim(lower(checkout_type)) not in ('product', 'service', 'subscription');

alter table public.checkout_sessions drop constraint if exists checkout_sessions_checkout_type_valid;

alter table public.checkout_sessions
  add constraint checkout_sessions_checkout_type_valid check (
    checkout_type in ('product', 'service', 'subscription')
  );
create table if not exists public.buyer_subscriptions (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  plan_tier text not null,
  status text not null default 'pending',
  billing_interval text not null default 'monthly',
  amount numeric(12, 2) not null default 0,
  currency text not null default 'UGX',
  checkout_id text references public.checkout_sessions(id) on delete set null,
  started_at timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_subscriptions_customer_id_idx
  on public.buyer_subscriptions (customer_id, created_at desc);

create unique index if not exists buyer_subscriptions_one_active_per_customer_key
  on public.buyer_subscriptions (customer_id)
  where status in ('active', 'pending');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_subscriptions_tier_valid' and conrelid = 'public.buyer_subscriptions'::regclass
  ) then
    alter table public.buyer_subscriptions add constraint buyer_subscriptions_tier_valid check (
      plan_tier in ('platinum', 'gold', 'silver', 'bronze')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_subscriptions_status_valid' and conrelid = 'public.buyer_subscriptions'::regclass
  ) then
    alter table public.buyer_subscriptions add constraint buyer_subscriptions_status_valid check (
      status in ('pending', 'active', 'cancelled', 'past_due', 'expired')
    );
  end if;
end $$;

create or replace function public.buyer_subscriptions_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists buyer_subscriptions_set_updated_at on public.buyer_subscriptions;
create trigger buyer_subscriptions_set_updated_at
  before update on public.buyer_subscriptions
  for each row execute procedure public.buyer_subscriptions_set_updated_at();

comment on table public.buyer_subscriptions is 'Buyer membership tiers: Platinum, Gold, Silver, Bronze.';
