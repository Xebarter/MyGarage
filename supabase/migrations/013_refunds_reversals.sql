-- Refunds and reversals workflow across checkout, orders, payments, and disbursements.

-- 1) Unified refund records (product checkout/order + service payment scope).
create table if not exists public.refund_requests (
  id text primary key,
  refund_type text not null,
  checkout_id text references public.checkout_sessions(id) on delete set null,
  product_order_id text references public.product_orders(id) on delete set null,
  service_payment_id text references public.service_payments(id) on delete set null,
  customer_id text references public.customers(id) on delete set null,
  vendor_id text references public.vendors(id) on delete set null,
  currency text not null default 'UGX',
  requested_amount numeric(12, 2) not null default 0,
  approved_amount numeric(12, 2) not null default 0,
  status text not null default 'requested',
  reason text,
  requested_by text,
  approved_by text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  processed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists refund_requests_status_idx
  on public.refund_requests (status);
create index if not exists refund_requests_customer_id_idx
  on public.refund_requests (customer_id, created_at desc);
create index if not exists refund_requests_vendor_id_idx
  on public.refund_requests (vendor_id, created_at desc);
create index if not exists refund_requests_checkout_id_idx
  on public.refund_requests (checkout_id);
create index if not exists refund_requests_product_order_id_idx
  on public.refund_requests (product_order_id);
create index if not exists refund_requests_service_payment_id_idx
  on public.refund_requests (service_payment_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'refund_requests_type_valid' and conrelid = 'public.refund_requests'::regclass
  ) then
    alter table public.refund_requests add constraint refund_requests_type_valid check (
      refund_type in ('product', 'service')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'refund_requests_status_valid' and conrelid = 'public.refund_requests'::regclass
  ) then
    alter table public.refund_requests add constraint refund_requests_status_valid check (
      status in ('requested', 'approved', 'processing', 'succeeded', 'failed', 'rejected', 'cancelled')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'refund_requests_currency_valid' and conrelid = 'public.refund_requests'::regclass
  ) then
    alter table public.refund_requests add constraint refund_requests_currency_valid check (currency in ('UGX'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'refund_requests_amounts_nonnegative' and conrelid = 'public.refund_requests'::regclass
  ) then
    alter table public.refund_requests add constraint refund_requests_amounts_nonnegative check (
      requested_amount >= 0
      and approved_amount >= 0
      and approved_amount <= requested_amount
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'refund_requests_scope_valid' and conrelid = 'public.refund_requests'::regclass
  ) then
    alter table public.refund_requests add constraint refund_requests_scope_valid check (
      (refund_type = 'product' and (checkout_id is not null or product_order_id is not null))
      or (refund_type = 'service' and service_payment_id is not null)
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'refund_requests_metadata_is_object' and conrelid = 'public.refund_requests'::regclass
  ) then
    alter table public.refund_requests add constraint refund_requests_metadata_is_object check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

-- 2) updated_at trigger.
create or replace function public.refund_requests_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists refund_requests_set_updated_at on public.refund_requests;
create trigger refund_requests_set_updated_at
  before update on public.refund_requests
  for each row
  execute procedure public.refund_requests_set_updated_at();

-- 3) Status transition helper.
create or replace function public.is_valid_refund_status_transition(old_status text, new_status text)
returns boolean
language sql
immutable
as $$
  select case
    when old_status = new_status then true
    when old_status = 'requested' and new_status in ('approved', 'rejected', 'cancelled') then true
    when old_status = 'approved' and new_status in ('processing', 'cancelled') then true
    when old_status = 'processing' and new_status in ('succeeded', 'failed') then true
    when old_status = 'failed' and new_status in ('processing', 'cancelled') then true
    else false
  end
$$;

-- 4) Create a refund request from checkout/order/service context.
create or replace function public.create_refund_request(
  p_refund_id text,
  p_refund_type text,
  p_requested_amount numeric,
  p_reason text default null,
  p_requested_by text default null,
  p_checkout_id text default null,
  p_product_order_id text default null,
  p_service_payment_id text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_currency text := 'UGX';
  v_customer_id text;
  v_vendor_id text;
begin
  if p_refund_id is null or length(trim(p_refund_id)) = 0 then
    raise exception 'refund id is required';
  end if;

  if p_refund_type not in ('product', 'service') then
    raise exception 'refund type must be product or service';
  end if;

  if p_requested_amount is null or p_requested_amount < 0 then
    raise exception 'requested amount must be nonnegative';
  end if;

  if p_refund_type = 'product' then
    if p_checkout_id is null and p_product_order_id is null then
      raise exception 'product refund requires checkout_id or product_order_id';
    end if;

    if p_product_order_id is not null then
      select po.currency, po.customer_id
      into v_currency, v_customer_id
      from public.product_orders po
      where po.id = p_product_order_id;

      if not found then
        raise exception 'product order not found: %', p_product_order_id;
      end if;
    elsif p_checkout_id is not null then
      select cs.currency, cs.customer_id
      into v_currency, v_customer_id
      from public.checkout_sessions cs
      where cs.id = p_checkout_id;

      if not found then
        raise exception 'checkout not found: %', p_checkout_id;
      end if;
    end if;
  else
    if p_service_payment_id is null then
      raise exception 'service refund requires service_payment_id';
    end if;

    select sp.currency, sp.customer_id, sp.provider_id
    into v_currency, v_customer_id, v_vendor_id
    from public.service_payments sp
    where sp.id = p_service_payment_id;

    if not found then
      raise exception 'service payment not found: %', p_service_payment_id;
    end if;
  end if;

  insert into public.refund_requests (
    id,
    refund_type,
    checkout_id,
    product_order_id,
    service_payment_id,
    customer_id,
    vendor_id,
    currency,
    requested_amount,
    approved_amount,
    status,
    reason,
    requested_by,
    metadata
  )
  values (
    p_refund_id,
    p_refund_type,
    p_checkout_id,
    p_product_order_id,
    p_service_payment_id,
    v_customer_id,
    v_vendor_id,
    v_currency,
    p_requested_amount,
    0,
    'requested',
    p_reason,
    p_requested_by,
    '{}'::jsonb
  );

  return p_refund_id;
end;
$$;

-- 5) Approve/reject and move into processing.
create or replace function public.admin_set_refund_status(
  p_refund_id text,
  p_status text,
  p_actor_id text default null,
  p_approved_amount numeric default null,
  p_provider_reference text default null,
  p_failure_reason text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  rr public.refund_requests%rowtype;
  new_amount numeric(12, 2);
begin
  if p_refund_id is null or length(trim(p_refund_id)) = 0 then
    raise exception 'refund id is required';
  end if;

  if p_status is null or length(trim(p_status)) = 0 then
    raise exception 'target status is required';
  end if;

  select *
  into rr
  from public.refund_requests r
  where r.id = p_refund_id;

  if not found then
    raise exception 'refund request not found: %', p_refund_id;
  end if;

  if not public.is_valid_refund_status_transition(rr.status, p_status) then
    raise exception 'invalid refund transition: % -> %', rr.status, p_status;
  end if;

  new_amount := coalesce(p_approved_amount, rr.approved_amount);
  if p_status in ('approved', 'processing', 'succeeded') and (new_amount is null or new_amount <= 0) then
    new_amount := rr.requested_amount;
  end if;

  if new_amount > rr.requested_amount then
    raise exception 'approved amount cannot exceed requested amount';
  end if;

  update public.refund_requests r
  set
    status = p_status,
    approved_amount = coalesce(new_amount, r.approved_amount),
    approved_by = case when p_status in ('approved', 'processing', 'succeeded', 'failed', 'rejected') then coalesce(p_actor_id, r.approved_by) else r.approved_by end,
    approved_at = case when p_status in ('approved', 'processing', 'succeeded') and r.approved_at is null then now() else r.approved_at end,
    processed_at = case when p_status = 'succeeded' then now() else r.processed_at end,
    failed_at = case when p_status = 'failed' then now() else r.failed_at end,
    provider_reference = coalesce(p_provider_reference, r.provider_reference),
    reason = case
      when p_status = 'failed' and p_failure_reason is not null and length(trim(p_failure_reason)) > 0
        then coalesce(r.reason, '') || case when r.reason is null or r.reason = '' then '' else ' | ' end || 'failure: ' || p_failure_reason
      else r.reason
    end
  where r.id = p_refund_id;

  return p_refund_id;
end;
$$;

-- 6) Apply successful refund side-effects.
create or replace function public.apply_successful_refund_effects(
  p_refund_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  rr public.refund_requests%rowtype;
begin
  if p_refund_id is null or length(trim(p_refund_id)) = 0 then
    raise exception 'refund id is required';
  end if;

  select *
  into rr
  from public.refund_requests r
  where r.id = p_refund_id;

  if not found then
    raise exception 'refund request not found: %', p_refund_id;
  end if;

  if rr.status <> 'succeeded' then
    raise exception 'refund % must be succeeded before applying side-effects', p_refund_id;
  end if;

  -- Product refund effects.
  if rr.refund_type = 'product' then
    if rr.checkout_id is not null then
      update public.checkout_sessions cs
      set status = 'cancelled'
      where cs.id = rr.checkout_id
        and cs.status in ('paid', 'fulfilled');
    end if;

    if rr.product_order_id is not null then
      update public.product_orders po
      set
        status = 'refunded',
        cancelled_at = coalesce(po.cancelled_at, now())
      where po.id = rr.product_order_id
        and po.status in ('pending_fulfillment', 'processing', 'shipped', 'delivered');

      -- Re-credit product stock based on order lines.
      update public.products p
      set stock = p.stock + x.qty
      from (
        select poi.product_id, sum(poi.quantity)::integer as qty
        from public.product_order_items poi
        where poi.order_id = rr.product_order_id
          and poi.product_id is not null
        group by poi.product_id
      ) x
      where p.id = x.product_id;

      update public.product_vendor_settlements pvs
      set status = 'reversed'
      where pvs.order_id = rr.product_order_id
        and pvs.status in ('pending', 'processing');

      update public.admin_disbursements ad
      set status = 'reversed'
      where ad.source_type = 'product_checkout'
        and ad.source_reference = rr.product_order_id
        and ad.status in ('pending_approval', 'approved', 'processing');
    end if;
  end if;

  -- Service refund effects.
  if rr.refund_type = 'service' and rr.service_payment_id is not null then
    update public.service_payments sp
    set status = 'refunded'
    where sp.id = rr.service_payment_id
      and sp.status in ('captured', 'authorized');

    update public.service_provider_payouts spp
    set status = 'reversed'
    where spp.payment_id = rr.service_payment_id
      and spp.status in ('pending', 'processing');

    update public.admin_disbursements ad
    set status = 'reversed'
    where ad.service_payment_id = rr.service_payment_id
      and ad.status in ('pending_approval', 'approved', 'processing');
  end if;

  return p_refund_id;
end;
$$;

-- 7) Webhook finalizer for Paytota refund callbacks.
create or replace function public.on_paytota_webhook_finalize_refund(
  p_refund_id text,
  p_provider_status text,
  p_provider_reference text default null,
  p_payload jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text;
begin
  if p_refund_id is null or length(trim(p_refund_id)) = 0 then
    raise exception 'refund id is required';
  end if;

  if p_provider_status is null or length(trim(p_provider_status)) = 0 then
    raise exception 'provider status is required';
  end if;

  normalized_status := case lower(trim(p_provider_status))
    when 'success' then 'succeeded'
    when 'succeeded' then 'succeeded'
    when 'completed' then 'succeeded'
    when 'processing' then 'processing'
    when 'pending' then 'processing'
    when 'failed' then 'failed'
    when 'error' then 'failed'
    when 'cancelled' then 'cancelled'
    when 'canceled' then 'cancelled'
    else 'processing'
  end;

  if normalized_status = 'succeeded' then
    perform public.admin_set_refund_status(
      p_refund_id,
      'succeeded',
      null,
      null,
      p_provider_reference,
      null
    );
    perform public.apply_successful_refund_effects(p_refund_id);
  elsif normalized_status = 'failed' then
    perform public.admin_set_refund_status(
      p_refund_id,
      'failed',
      null,
      null,
      p_provider_reference,
      'provider_failed'
    );
  elsif normalized_status = 'cancelled' then
    perform public.admin_set_refund_status(
      p_refund_id,
      'cancelled',
      null,
      null,
      p_provider_reference,
      null
    );
  else
    perform public.admin_set_refund_status(
      p_refund_id,
      'processing',
      null,
      null,
      p_provider_reference,
      null
    );
  end if;

  -- Keep Paytota transaction log in sync for refund records.
  update public.paytota_transactions pt
  set
    provider_status = p_provider_status,
    status = case
      when normalized_status = 'succeeded' then 'succeeded'
      when normalized_status = 'failed' then 'failed'
      when normalized_status = 'cancelled' then 'cancelled'
      else 'processing'
    end,
    provider_reference = coalesce(p_provider_reference, pt.provider_reference),
    webhook_payload = case
      when jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) = 'object' then coalesce(p_payload, '{}'::jsonb)
      else '{}'::jsonb
    end,
    processed_at = now()
  where pt.transaction_type = 'refund'
    and (
      pt.provider_reference = p_provider_reference
      or (pt.response_payload ? 'refund_id' and pt.response_payload ->> 'refund_id' = p_refund_id)
      or (pt.request_payload ? 'refund_id' and pt.request_payload ->> 'refund_id' = p_refund_id)
    );

  return p_refund_id;
end;
$$;

-- 8) RLS.
alter table public.refund_requests enable row level security;

create policy "refund_requests_select_owner_vendor_admin"
  on public.refund_requests
  for select
  to authenticated
  using (
    public.is_admin_user()
    or customer_id = public.current_app_user_id()
    or vendor_id = public.current_app_user_id()
  );

create policy "refund_requests_write_admin_only"
  on public.refund_requests
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

comment on table public.refund_requests is 'Unified refund requests across product checkouts/orders and service payments.';
comment on function public.create_refund_request(text, text, numeric, text, text, text, text, text) is 'Creates a refund request from product checkout/order or service payment scope.';
comment on function public.admin_set_refund_status(text, text, text, numeric, text, text) is 'Admin state transition function for refund lifecycle.';
comment on function public.apply_successful_refund_effects(text) is 'Applies stock/order/payment/disbursement side-effects after successful refund.';
comment on function public.on_paytota_webhook_finalize_refund(text, text, text, jsonb) is 'Finalizes refund status using Paytota webhook callback and syncs transaction log.';
