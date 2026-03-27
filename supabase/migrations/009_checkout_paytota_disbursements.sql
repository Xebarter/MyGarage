-- Unified checkout + Paytota payments + admin disbursement workflow for MyGarage.
-- Supports both product and service checkout flows with a shared payment backbone.

-- 1) Checkout sessions (single source of truth for in-progress/paid checkouts).
create table if not exists public.checkout_sessions (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  checkout_type text not null,
  status text not null default 'draft',
  currency text not null default 'UGX',
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  platform_fee_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  payment_provider text not null default 'paytota',
  payment_reference text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checkout_sessions_customer_id_idx
  on public.checkout_sessions (customer_id, created_at desc);
create index if not exists checkout_sessions_status_idx
  on public.checkout_sessions (status);
create index if not exists checkout_sessions_checkout_type_idx
  on public.checkout_sessions (checkout_type);
create unique index if not exists checkout_sessions_idempotency_key_key
  on public.checkout_sessions (idempotency_key)
  where idempotency_key is not null;
create unique index if not exists checkout_sessions_payment_reference_key
  on public.checkout_sessions (payment_reference)
  where payment_reference is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_checkout_type_valid' and conrelid = 'public.checkout_sessions'::regclass
  ) then
    alter table public.checkout_sessions add constraint checkout_sessions_checkout_type_valid check (
      checkout_type in ('product', 'service')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_status_valid' and conrelid = 'public.checkout_sessions'::regclass
  ) then
    alter table public.checkout_sessions add constraint checkout_sessions_status_valid check (
      status in ('draft', 'review', 'payment_pending', 'paid', 'failed', 'cancelled', 'expired', 'fulfilled')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_currency_valid' and conrelid = 'public.checkout_sessions'::regclass
  ) then
    alter table public.checkout_sessions add constraint checkout_sessions_currency_valid check (currency in ('UGX'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_amounts_nonnegative' and conrelid = 'public.checkout_sessions'::regclass
  ) then
    alter table public.checkout_sessions add constraint checkout_sessions_amounts_nonnegative check (
      subtotal_amount >= 0
      and discount_amount >= 0
      and platform_fee_amount >= 0
      and tax_amount >= 0
      and total_amount >= 0
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_provider_valid' and conrelid = 'public.checkout_sessions'::regclass
  ) then
    alter table public.checkout_sessions add constraint checkout_sessions_provider_valid check (
      payment_provider in ('paytota')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_metadata_is_object' and conrelid = 'public.checkout_sessions'::regclass
  ) then
    alter table public.checkout_sessions add constraint checkout_sessions_metadata_is_object check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

-- 2) Checkout line items (supports mixed vendors and both product/service entries).
create table if not exists public.checkout_line_items (
  id text primary key,
  checkout_id text not null references public.checkout_sessions(id) on delete cascade,
  line_type text not null,
  product_id text references public.products(id) on delete set null,
  service_request_id text references public.buyer_service_requests(id) on delete set null,
  vendor_id text references public.vendors(id) on delete set null,
  title text not null default '',
  quantity integer not null default 1,
  unit_amount numeric(12, 2) not null default 0,
  line_total_amount numeric(12, 2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists checkout_line_items_checkout_id_idx
  on public.checkout_line_items (checkout_id);
create index if not exists checkout_line_items_vendor_id_idx
  on public.checkout_line_items (vendor_id);
create index if not exists checkout_line_items_product_id_idx
  on public.checkout_line_items (product_id);
create index if not exists checkout_line_items_service_request_id_idx
  on public.checkout_line_items (service_request_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_line_items_line_type_valid' and conrelid = 'public.checkout_line_items'::regclass
  ) then
    alter table public.checkout_line_items add constraint checkout_line_items_line_type_valid check (
      line_type in ('product', 'service')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_line_items_quantity_positive' and conrelid = 'public.checkout_line_items'::regclass
  ) then
    alter table public.checkout_line_items add constraint checkout_line_items_quantity_positive check (quantity > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_line_items_amounts_nonnegative' and conrelid = 'public.checkout_line_items'::regclass
  ) then
    alter table public.checkout_line_items add constraint checkout_line_items_amounts_nonnegative check (
      unit_amount >= 0 and line_total_amount >= 0
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_line_items_title_not_blank' and conrelid = 'public.checkout_line_items'::regclass
  ) then
    alter table public.checkout_line_items add constraint checkout_line_items_title_not_blank check (
      length(trim(title)) > 0
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_line_items_metadata_is_object' and conrelid = 'public.checkout_line_items'::regclass
  ) then
    alter table public.checkout_line_items add constraint checkout_line_items_metadata_is_object check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_line_items_product_or_service_required' and conrelid = 'public.checkout_line_items'::regclass
  ) then
    alter table public.checkout_line_items add constraint checkout_line_items_product_or_service_required check (
      (line_type = 'product' and product_id is not null and service_request_id is null)
      or (line_type = 'service' and service_request_id is not null and product_id is null)
    );
  end if;
end $$;

-- 3) Paytota transaction log (authoritative payment/disbursement integration records).
create table if not exists public.paytota_transactions (
  id text primary key,
  transaction_type text not null,
  direction text not null,
  checkout_id text references public.checkout_sessions(id) on delete set null,
  service_payment_id text references public.service_payments(id) on delete set null,
  provider_payout_id text references public.service_provider_payouts(id) on delete set null,
  customer_id text references public.customers(id) on delete set null,
  vendor_id text references public.vendors(id) on delete set null,
  currency text not null default 'UGX',
  amount numeric(12, 2) not null default 0,
  provider_reference text,
  provider_status text,
  status text not null default 'pending',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  webhook_payload jsonb not null default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paytota_transactions_checkout_id_idx
  on public.paytota_transactions (checkout_id);
create index if not exists paytota_transactions_service_payment_id_idx
  on public.paytota_transactions (service_payment_id);
create index if not exists paytota_transactions_provider_payout_id_idx
  on public.paytota_transactions (provider_payout_id);
create index if not exists paytota_transactions_status_idx
  on public.paytota_transactions (status);
create index if not exists paytota_transactions_vendor_id_idx
  on public.paytota_transactions (vendor_id);
create unique index if not exists paytota_transactions_provider_reference_key
  on public.paytota_transactions (provider_reference)
  where provider_reference is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'paytota_transactions_type_valid' and conrelid = 'public.paytota_transactions'::regclass
  ) then
    alter table public.paytota_transactions add constraint paytota_transactions_type_valid check (
      transaction_type in ('collection', 'disbursement', 'refund', 'reversal')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'paytota_transactions_direction_valid' and conrelid = 'public.paytota_transactions'::regclass
  ) then
    alter table public.paytota_transactions add constraint paytota_transactions_direction_valid check (
      direction in ('inbound', 'outbound')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'paytota_transactions_status_valid' and conrelid = 'public.paytota_transactions'::regclass
  ) then
    alter table public.paytota_transactions add constraint paytota_transactions_status_valid check (
      status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'paytota_transactions_currency_valid' and conrelid = 'public.paytota_transactions'::regclass
  ) then
    alter table public.paytota_transactions add constraint paytota_transactions_currency_valid check (currency in ('UGX'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'paytota_transactions_amount_nonnegative' and conrelid = 'public.paytota_transactions'::regclass
  ) then
    alter table public.paytota_transactions add constraint paytota_transactions_amount_nonnegative check (amount >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'paytota_transactions_payloads_are_objects' and conrelid = 'public.paytota_transactions'::regclass
  ) then
    alter table public.paytota_transactions add constraint paytota_transactions_payloads_are_objects check (
      jsonb_typeof(request_payload) = 'object'
      and jsonb_typeof(response_payload) = 'object'
      and jsonb_typeof(webhook_payload) = 'object'
    );
  end if;
end $$;

-- 4) Vendor payout destinations for disbursement execution.
create table if not exists public.vendor_payout_accounts (
  id text primary key,
  vendor_id text not null references public.vendors(id) on delete cascade,
  provider text not null default 'paytota',
  account_type text not null default 'mobile_money',
  account_name text not null default '',
  account_number text not null default '',
  network text,
  is_default boolean not null default false,
  is_verified boolean not null default false,
  verification_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_payout_accounts_vendor_id_idx
  on public.vendor_payout_accounts (vendor_id);
create unique index if not exists vendor_payout_accounts_default_per_vendor_key
  on public.vendor_payout_accounts (vendor_id)
  where is_default = true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendor_payout_accounts_provider_valid' and conrelid = 'public.vendor_payout_accounts'::regclass
  ) then
    alter table public.vendor_payout_accounts add constraint vendor_payout_accounts_provider_valid check (
      provider in ('paytota')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendor_payout_accounts_type_valid' and conrelid = 'public.vendor_payout_accounts'::regclass
  ) then
    alter table public.vendor_payout_accounts add constraint vendor_payout_accounts_type_valid check (
      account_type in ('mobile_money', 'bank_account')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendor_payout_accounts_name_not_blank' and conrelid = 'public.vendor_payout_accounts'::regclass
  ) then
    alter table public.vendor_payout_accounts add constraint vendor_payout_accounts_name_not_blank check (
      length(trim(account_name)) > 0
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendor_payout_accounts_number_not_blank' and conrelid = 'public.vendor_payout_accounts'::regclass
  ) then
    alter table public.vendor_payout_accounts add constraint vendor_payout_accounts_number_not_blank check (
      length(trim(account_number)) > 0
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendor_payout_accounts_metadata_is_object' and conrelid = 'public.vendor_payout_accounts'::regclass
  ) then
    alter table public.vendor_payout_accounts add constraint vendor_payout_accounts_metadata_is_object check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

-- 5) Admin disbursement records (single queue for payout operations).
create table if not exists public.admin_disbursements (
  id text primary key,
  vendor_id text not null references public.vendors(id) on delete cascade,
  payout_account_id text references public.vendor_payout_accounts(id) on delete set null,
  checkout_id text references public.checkout_sessions(id) on delete set null,
  service_payment_id text references public.service_payments(id) on delete set null,
  service_provider_payout_id text references public.service_provider_payouts(id) on delete set null,
  source_type text not null,
  source_reference text,
  currency text not null default 'UGX',
  gross_amount numeric(12, 2) not null default 0,
  fee_amount numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) not null default 0,
  status text not null default 'pending_approval',
  initiated_by text,
  approved_by text,
  rejected_reason text,
  payout_reference text,
  scheduled_for timestamptz,
  approved_at timestamptz,
  paid_out_at timestamptz,
  failed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_disbursements_vendor_id_idx
  on public.admin_disbursements (vendor_id, created_at desc);
create index if not exists admin_disbursements_status_idx
  on public.admin_disbursements (status);
create index if not exists admin_disbursements_scheduled_for_idx
  on public.admin_disbursements (scheduled_for);
create unique index if not exists admin_disbursements_payout_reference_key
  on public.admin_disbursements (payout_reference)
  where payout_reference is not null;
create unique index if not exists admin_disbursements_service_provider_payout_id_key
  on public.admin_disbursements (service_provider_payout_id)
  where service_provider_payout_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_disbursements_source_type_valid' and conrelid = 'public.admin_disbursements'::regclass
  ) then
    alter table public.admin_disbursements add constraint admin_disbursements_source_type_valid check (
      source_type in ('product_checkout', 'service_payment', 'manual_adjustment')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_disbursements_status_valid' and conrelid = 'public.admin_disbursements'::regclass
  ) then
    alter table public.admin_disbursements add constraint admin_disbursements_status_valid check (
      status in ('pending_approval', 'approved', 'processing', 'paid', 'failed', 'rejected', 'reversed')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_disbursements_currency_valid' and conrelid = 'public.admin_disbursements'::regclass
  ) then
    alter table public.admin_disbursements add constraint admin_disbursements_currency_valid check (currency in ('UGX'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_disbursements_amounts_nonnegative' and conrelid = 'public.admin_disbursements'::regclass
  ) then
    alter table public.admin_disbursements add constraint admin_disbursements_amounts_nonnegative check (
      gross_amount >= 0 and fee_amount >= 0 and net_amount >= 0 and net_amount <= gross_amount
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_disbursements_metadata_is_object' and conrelid = 'public.admin_disbursements'::regclass
  ) then
    alter table public.admin_disbursements add constraint admin_disbursements_metadata_is_object check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

-- 6) Keep service payout ledger connected to admin disbursement records.
alter table public.service_provider_payouts
  add column if not exists admin_disbursement_id text references public.admin_disbursements(id) on delete set null;

create index if not exists service_provider_payouts_admin_disbursement_id_idx
  on public.service_provider_payouts (admin_disbursement_id);

-- 7) Generic updated_at maintenance for new mutable tables.
create or replace function public.checkout_sessions_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checkout_sessions_set_updated_at on public.checkout_sessions;
create trigger checkout_sessions_set_updated_at
  before update on public.checkout_sessions
  for each row
  execute procedure public.checkout_sessions_set_updated_at();

create or replace function public.paytota_transactions_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists paytota_transactions_set_updated_at on public.paytota_transactions;
create trigger paytota_transactions_set_updated_at
  before update on public.paytota_transactions
  for each row
  execute procedure public.paytota_transactions_set_updated_at();

create or replace function public.vendor_payout_accounts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vendor_payout_accounts_set_updated_at on public.vendor_payout_accounts;
create trigger vendor_payout_accounts_set_updated_at
  before update on public.vendor_payout_accounts
  for each row
  execute procedure public.vendor_payout_accounts_set_updated_at();

create or replace function public.admin_disbursements_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_disbursements_set_updated_at on public.admin_disbursements;
create trigger admin_disbursements_set_updated_at
  before update on public.admin_disbursements
  for each row
  execute procedure public.admin_disbursements_set_updated_at();

-- 8) Checkout status transition guard (keeps UX flow state predictable).
create or replace function public.is_valid_checkout_status_transition(old_status text, new_status text)
returns boolean
language sql
immutable
as $$
  select case
    when old_status = new_status then true
    when old_status = 'draft' and new_status in ('review', 'cancelled', 'expired') then true
    when old_status = 'review' and new_status in ('payment_pending', 'draft', 'cancelled', 'expired') then true
    when old_status = 'payment_pending' and new_status in ('paid', 'failed', 'cancelled', 'expired') then true
    when old_status = 'failed' and new_status in ('payment_pending', 'cancelled') then true
    when old_status = 'paid' and new_status in ('fulfilled') then true
    else false
  end
$$;

create or replace function public.on_checkout_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if not public.is_valid_checkout_status_transition(old.status, new.status) then
      raise exception 'Invalid checkout status transition: % -> %', old.status, new.status;
    end if;

    if new.status = 'paid' and new.paid_at is null then
      new.paid_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists checkout_status_change_guard on public.checkout_sessions;
create trigger checkout_status_change_guard
  before update on public.checkout_sessions
  for each row
  execute procedure public.on_checkout_status_change();

-- 9) Create admin payout work item from a successful service payment.
create or replace function public.create_admin_disbursement_for_service_payment(
  p_disbursement_id text,
  p_service_payment_id text,
  p_fee_amount numeric default 0,
  p_initiated_by text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.service_payments%rowtype;
  payout_id text;
  payout_account_id text;
  gross_amount numeric(12, 2);
  fee_amount numeric(12, 2);
  net_amount numeric(12, 2);
begin
  if p_disbursement_id is null or length(trim(p_disbursement_id)) = 0 then
    raise exception 'disbursement id is required';
  end if;

  if p_service_payment_id is null or length(trim(p_service_payment_id)) = 0 then
    raise exception 'service payment id is required';
  end if;

  select *
  into payment_row
  from public.service_payments sp
  where sp.id = p_service_payment_id;

  if not found then
    raise exception 'service payment not found: %', p_service_payment_id;
  end if;

  if payment_row.provider_id is null then
    raise exception 'service payment % has no provider_id', p_service_payment_id;
  end if;

  if payment_row.status not in ('captured', 'authorized') then
    raise exception 'service payment % must be authorized or captured before disbursement', p_service_payment_id;
  end if;

  select s.id
  into payout_id
  from public.service_provider_payouts s
  where s.payment_id = payment_row.id
  order by s.created_at desc
  limit 1;

  if payout_id is not null then
    if exists (
      select 1
      from public.admin_disbursements ad
      where ad.service_provider_payout_id = payout_id
    ) then
      raise exception 'disbursement already exists for service payout %', payout_id;
    end if;
  end if;

  select vpa.id
  into payout_account_id
  from public.vendor_payout_accounts vpa
  where vpa.vendor_id = payment_row.provider_id
    and vpa.is_default = true
  order by vpa.created_at desc
  limit 1;

  gross_amount := payment_row.amount;
  fee_amount := greatest(0, coalesce(p_fee_amount, 0));
  net_amount := greatest(0, gross_amount - fee_amount);

  insert into public.admin_disbursements (
    id,
    vendor_id,
    payout_account_id,
    checkout_id,
    service_payment_id,
    service_provider_payout_id,
    source_type,
    source_reference,
    currency,
    gross_amount,
    fee_amount,
    net_amount,
    status,
    initiated_by,
    metadata
  )
  values (
    p_disbursement_id,
    payment_row.provider_id,
    payout_account_id,
    null,
    payment_row.id,
    payout_id,
    'service_payment',
    payment_row.id,
    payment_row.currency,
    gross_amount,
    fee_amount,
    net_amount,
    'pending_approval',
    p_initiated_by,
    jsonb_build_object(
      'origin', 'create_admin_disbursement_for_service_payment',
      'service_payment_status', payment_row.status
    )
  );

  if payout_id is not null then
    update public.service_provider_payouts
    set admin_disbursement_id = p_disbursement_id
    where id = payout_id;
  end if;

  return p_disbursement_id;
end;
$$;

-- 10) Checkout helper RPCs for a smooth app flow.
create or replace function public.upsert_checkout_line_item(
  p_line_item_id text,
  p_checkout_id text,
  p_line_type text,
  p_title text,
  p_quantity integer,
  p_unit_amount numeric,
  p_product_id text default null,
  p_service_request_id text default null,
  p_vendor_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  checkout_row public.checkout_sessions%rowtype;
  line_total numeric(12, 2);
begin
  if p_line_item_id is null or length(trim(p_line_item_id)) = 0 then
    raise exception 'line item id is required';
  end if;

  if p_checkout_id is null or length(trim(p_checkout_id)) = 0 then
    raise exception 'checkout id is required';
  end if;

  if p_line_type not in ('product', 'service') then
    raise exception 'line type must be product or service';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be at least 1';
  end if;

  if p_unit_amount is null or p_unit_amount < 0 then
    raise exception 'unit amount must be nonnegative';
  end if;

  if p_line_type = 'product' and (p_product_id is null or p_service_request_id is not null) then
    raise exception 'product line must have product_id and no service_request_id';
  end if;

  if p_line_type = 'service' and (p_service_request_id is null or p_product_id is not null) then
    raise exception 'service line must have service_request_id and no product_id';
  end if;

  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'metadata must be a json object';
  end if;

  select *
  into checkout_row
  from public.checkout_sessions cs
  where cs.id = p_checkout_id;

  if not found then
    raise exception 'checkout not found: %', p_checkout_id;
  end if;

  if checkout_row.status not in ('draft', 'review') then
    raise exception 'checkout % is not editable in status %', p_checkout_id, checkout_row.status;
  end if;

  line_total := (p_quantity::numeric * p_unit_amount)::numeric(12, 2);

  insert into public.checkout_line_items (
    id,
    checkout_id,
    line_type,
    product_id,
    service_request_id,
    vendor_id,
    title,
    quantity,
    unit_amount,
    line_total_amount,
    metadata
  )
  values (
    p_line_item_id,
    p_checkout_id,
    p_line_type,
    p_product_id,
    p_service_request_id,
    p_vendor_id,
    p_title,
    p_quantity,
    p_unit_amount,
    line_total,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (id) do update set
    checkout_id = excluded.checkout_id,
    line_type = excluded.line_type,
    product_id = excluded.product_id,
    service_request_id = excluded.service_request_id,
    vendor_id = excluded.vendor_id,
    title = excluded.title,
    quantity = excluded.quantity,
    unit_amount = excluded.unit_amount,
    line_total_amount = excluded.line_total_amount,
    metadata = excluded.metadata;

  update public.checkout_sessions cs
  set
    subtotal_amount = sums.subtotal_amount,
    total_amount = greatest(
      0,
      sums.subtotal_amount
      - coalesce(cs.discount_amount, 0)
      + coalesce(cs.platform_fee_amount, 0)
      + coalesce(cs.tax_amount, 0)
    )::numeric(12, 2)
  from (
    select coalesce(sum(cli.line_total_amount), 0)::numeric(12, 2) as subtotal_amount
    from public.checkout_line_items cli
    where cli.checkout_id = p_checkout_id
  ) sums
  where cs.id = p_checkout_id;

  return p_line_item_id;
end;
$$;

create or replace function public.mark_checkout_ready_for_payment(
  p_checkout_id text,
  p_idempotency_key text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  has_items boolean;
begin
  if p_checkout_id is null or length(trim(p_checkout_id)) = 0 then
    raise exception 'checkout id is required';
  end if;

  if p_idempotency_key is not null and length(trim(p_idempotency_key)) = 0 then
    p_idempotency_key := null;
  end if;

  select exists (
    select 1
    from public.checkout_line_items cli
    where cli.checkout_id = p_checkout_id
  )
  into has_items;

  if not has_items then
    raise exception 'checkout % must have at least one line item', p_checkout_id;
  end if;

  update public.checkout_sessions cs
  set
    status = 'payment_pending',
    idempotency_key = coalesce(p_idempotency_key, cs.idempotency_key),
    expires_at = coalesce(cs.expires_at, now() + interval '30 minutes')
  where cs.id = p_checkout_id
    and cs.status in ('draft', 'review', 'failed');

  if not found then
    raise exception 'checkout % not found or not ready for payment transition', p_checkout_id;
  end if;

  return p_checkout_id;
end;
$$;

-- 10) Admin dashboard views.
create or replace view public.admin_disbursement_queue as
select
  ad.id,
  ad.vendor_id,
  v.name as vendor_name,
  ad.source_type,
  ad.source_reference,
  ad.status,
  ad.currency,
  ad.gross_amount,
  ad.fee_amount,
  ad.net_amount,
  ad.payout_reference,
  ad.scheduled_for,
  ad.approved_at,
  ad.paid_out_at,
  ad.failed_at,
  ad.created_at
from public.admin_disbursements ad
left join public.vendors v on v.id = ad.vendor_id;

create or replace view public.checkout_progress as
select
  cs.id as checkout_id,
  cs.customer_id,
  cs.checkout_type,
  cs.status,
  cs.currency,
  cs.total_amount,
  cs.payment_provider,
  cs.payment_reference,
  cs.expires_at,
  cs.paid_at,
  cs.created_at,
  cs.updated_at,
  coalesce(items.item_count, 0) as item_count,
  coalesce(items.vendor_count, 0) as vendor_count
from public.checkout_sessions cs
left join (
  select
    cli.checkout_id,
    count(*)::integer as item_count,
    count(distinct cli.vendor_id)::integer as vendor_count
  from public.checkout_line_items cli
  group by cli.checkout_id
) items on items.checkout_id = cs.id;

-- 11) RLS + baseline read policies.
alter table public.checkout_sessions enable row level security;
alter table public.checkout_line_items enable row level security;
alter table public.paytota_transactions enable row level security;
alter table public.vendor_payout_accounts enable row level security;
alter table public.admin_disbursements enable row level security;

drop policy if exists "checkout_sessions_select_public" on public.checkout_sessions;
create policy "checkout_sessions_select_public"
  on public.checkout_sessions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "checkout_line_items_select_public" on public.checkout_line_items;
create policy "checkout_line_items_select_public"
  on public.checkout_line_items
  for select
  to anon, authenticated
  using (true);

drop policy if exists "paytota_transactions_select_public" on public.paytota_transactions;
create policy "paytota_transactions_select_public"
  on public.paytota_transactions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "vendor_payout_accounts_select_public" on public.vendor_payout_accounts;
create policy "vendor_payout_accounts_select_public"
  on public.vendor_payout_accounts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "admin_disbursements_select_public" on public.admin_disbursements;
create policy "admin_disbursements_select_public"
  on public.admin_disbursements
  for select
  to anon, authenticated
  using (true);

comment on table public.checkout_sessions is 'Unified checkout state machine for product and service purchases.';
comment on table public.checkout_line_items is 'Line items linked to checkout sessions across products and service requests.';
comment on table public.paytota_transactions is 'Raw and normalized Paytota transaction lifecycle records.';
comment on table public.vendor_payout_accounts is 'Vendor payout destinations used for disbursements.';
comment on table public.admin_disbursements is 'Admin-managed payout queue and execution records.';
comment on view public.admin_disbursement_queue is 'Dashboard view for operational payout management.';
comment on view public.checkout_progress is 'Checkout progress and completion metrics for UX tracking.';
comment on function public.upsert_checkout_line_item(text, text, text, text, integer, numeric, text, text, text, jsonb) is 'Adds or updates a checkout line item and recalculates checkout totals.';
comment on function public.mark_checkout_ready_for_payment(text, text) is 'Validates checkout completeness and transitions it to payment_pending for Paytota collection.';
comment on function public.create_admin_disbursement_for_service_payment(text, text, numeric, text) is 'Creates a pending admin disbursement from an authorized/captured service payment.';
