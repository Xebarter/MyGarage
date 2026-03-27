-- Service operations expansion for MyGarage.
-- Extends buyer_service_requests into a complete dispatch + payments + audit workflow.

-- 1) Extend core request table with assignment, SLA, geo, and cancellation fields.
alter table public.buyer_service_requests
  add column if not exists provider_id text references public.vendors(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text,
  add column if not exists cancellation_reason text,
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists scheduled_for timestamptz,
  add column if not exists priority text not null default 'normal',
  add column if not exists idempotency_key text;

create index if not exists buyer_service_requests_provider_id_idx on public.buyer_service_requests (provider_id);
create index if not exists buyer_service_requests_priority_idx on public.buyer_service_requests (priority);
create unique index if not exists buyer_service_requests_idempotency_key_key
  on public.buyer_service_requests (idempotency_key)
  where idempotency_key is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_service_requests_priority_valid' and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests add constraint buyer_service_requests_priority_valid check (
      priority in ('low', 'normal', 'high', 'urgent')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_service_requests_cancelled_by_valid' and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests add constraint buyer_service_requests_cancelled_by_valid check (
      cancelled_by is null or cancelled_by in ('buyer', 'provider', 'admin', 'system')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_service_requests_latitude_range' and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests add constraint buyer_service_requests_latitude_range check (
      latitude is null or (latitude >= -90 and latitude <= 90)
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_service_requests_longitude_range' and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests add constraint buyer_service_requests_longitude_range check (
      longitude is null or (longitude >= -180 and longitude <= 180)
    );
  end if;
end $$;

-- 2) Assignment history (supports reassignments, declines, and response timing).
create table if not exists public.service_request_assignments (
  id text primary key,
  request_id text not null references public.buyer_service_requests(id) on delete cascade,
  provider_id text not null references public.vendors(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  responded_at timestamptz,
  response text not null default 'pending',
  response_note text,
  created_at timestamptz not null default now()
);

create index if not exists service_request_assignments_request_id_idx on public.service_request_assignments (request_id);
create index if not exists service_request_assignments_provider_id_idx on public.service_request_assignments (provider_id);
create index if not exists service_request_assignments_assigned_at_idx on public.service_request_assignments (assigned_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_assignments_response_valid' and conrelid = 'public.service_request_assignments'::regclass
  ) then
    alter table public.service_request_assignments add constraint service_request_assignments_response_valid check (
      response in ('pending', 'accepted', 'declined', 'expired')
    );
  end if;
end $$;

-- 3) Immutable timeline for request lifecycle and auditability.
create table if not exists public.service_request_events (
  id text primary key,
  request_id text not null references public.buyer_service_requests(id) on delete cascade,
  actor_type text not null,
  actor_id text,
  event_type text not null,
  event_note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists service_request_events_request_id_idx on public.service_request_events (request_id, created_at desc);
create index if not exists service_request_events_event_type_idx on public.service_request_events (event_type);
create index if not exists service_request_events_payload_gin_idx on public.service_request_events using gin (payload);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_events_actor_type_valid' and conrelid = 'public.service_request_events'::regclass
  ) then
    alter table public.service_request_events add constraint service_request_events_actor_type_valid check (
      actor_type in ('buyer', 'provider', 'admin', 'system')
    );
  end if;
end $$;

-- 4) Commercial workflow: quote/estimate per request (single active accepted quote expected by app logic).
create table if not exists public.service_request_quotes (
  id text primary key,
  request_id text not null references public.buyer_service_requests(id) on delete cascade,
  provider_id text not null references public.vendors(id) on delete cascade,
  currency text not null default 'UGX',
  base_amount numeric(12, 2) not null default 0,
  extra_charges_amount numeric(12, 2) not null default 0,
  platform_fee_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  status text not null default 'proposed',
  expires_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_request_quotes_request_id_idx on public.service_request_quotes (request_id, created_at desc);
create index if not exists service_request_quotes_provider_id_idx on public.service_request_quotes (provider_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_quotes_currency_valid' and conrelid = 'public.service_request_quotes'::regclass
  ) then
    alter table public.service_request_quotes add constraint service_request_quotes_currency_valid check (currency in ('UGX'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_quotes_amounts_nonnegative' and conrelid = 'public.service_request_quotes'::regclass
  ) then
    alter table public.service_request_quotes add constraint service_request_quotes_amounts_nonnegative check (
      base_amount >= 0 and extra_charges_amount >= 0 and platform_fee_amount >= 0 and total_amount >= 0
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_quotes_status_valid' and conrelid = 'public.service_request_quotes'::regclass
  ) then
    alter table public.service_request_quotes add constraint service_request_quotes_status_valid check (
      status in ('proposed', 'accepted', 'rejected', 'expired')
    );
  end if;
end $$;

create or replace function public.service_request_quotes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists service_request_quotes_set_updated_at on public.service_request_quotes;
create trigger service_request_quotes_set_updated_at
  before update on public.service_request_quotes
  for each row
  execute procedure public.service_request_quotes_set_updated_at();

-- 5) Payment transactions.
create table if not exists public.service_payments (
  id text primary key,
  request_id text not null references public.buyer_service_requests(id) on delete cascade,
  quote_id text references public.service_request_quotes(id) on delete set null,
  customer_id text not null references public.customers(id) on delete cascade,
  provider_id text references public.vendors(id) on delete set null,
  currency text not null default 'UGX',
  amount numeric(12, 2) not null default 0,
  payment_method text not null default 'cash',
  payment_provider text,
  provider_reference text,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_payments_request_id_idx on public.service_payments (request_id);
create index if not exists service_payments_customer_id_idx on public.service_payments (customer_id);
create index if not exists service_payments_status_idx on public.service_payments (status);
create unique index if not exists service_payments_provider_reference_key
  on public.service_payments (provider_reference)
  where provider_reference is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_payments_currency_valid' and conrelid = 'public.service_payments'::regclass
  ) then
    alter table public.service_payments add constraint service_payments_currency_valid check (currency in ('UGX'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_payments_amount_nonnegative' and conrelid = 'public.service_payments'::regclass
  ) then
    alter table public.service_payments add constraint service_payments_amount_nonnegative check (amount >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_payments_method_valid' and conrelid = 'public.service_payments'::regclass
  ) then
    alter table public.service_payments add constraint service_payments_method_valid check (
      payment_method in ('cash', 'mobile_money', 'card', 'bank_transfer')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_payments_status_valid' and conrelid = 'public.service_payments'::regclass
  ) then
    alter table public.service_payments add constraint service_payments_status_valid check (
      status in ('pending', 'authorized', 'captured', 'failed', 'refunded', 'cancelled')
    );
  end if;
end $$;

create or replace function public.service_payments_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists service_payments_set_updated_at on public.service_payments;
create trigger service_payments_set_updated_at
  before update on public.service_payments
  for each row
  execute procedure public.service_payments_set_updated_at();

-- 6) Provider payout ledger.
create table if not exists public.service_provider_payouts (
  id text primary key,
  payment_id text not null references public.service_payments(id) on delete cascade,
  provider_id text not null references public.vendors(id) on delete cascade,
  gross_amount numeric(12, 2) not null default 0,
  fee_amount numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) not null default 0,
  status text not null default 'pending',
  payout_reference text,
  paid_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_provider_payouts_payment_id_idx on public.service_provider_payouts (payment_id);
create index if not exists service_provider_payouts_provider_id_idx on public.service_provider_payouts (provider_id);
create index if not exists service_provider_payouts_status_idx on public.service_provider_payouts (status);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_provider_payouts_amounts_nonnegative' and conrelid = 'public.service_provider_payouts'::regclass
  ) then
    alter table public.service_provider_payouts add constraint service_provider_payouts_amounts_nonnegative check (
      gross_amount >= 0 and fee_amount >= 0 and net_amount >= 0 and net_amount <= gross_amount
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_provider_payouts_status_valid' and conrelid = 'public.service_provider_payouts'::regclass
  ) then
    alter table public.service_provider_payouts add constraint service_provider_payouts_status_valid check (
      status in ('pending', 'processing', 'paid', 'failed', 'reversed')
    );
  end if;
end $$;

create or replace function public.service_provider_payouts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists service_provider_payouts_set_updated_at on public.service_provider_payouts;
create trigger service_provider_payouts_set_updated_at
  before update on public.service_provider_payouts
  for each row
  execute procedure public.service_provider_payouts_set_updated_at();

-- 7) Service messaging thread (buyer/provider/admin/system).
create table if not exists public.service_request_messages (
  id text primary key,
  request_id text not null references public.buyer_service_requests(id) on delete cascade,
  sender_type text not null,
  sender_id text,
  message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists service_request_messages_request_id_idx on public.service_request_messages (request_id, created_at asc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_messages_sender_type_valid' and conrelid = 'public.service_request_messages'::regclass
  ) then
    alter table public.service_request_messages add constraint service_request_messages_sender_type_valid check (
      sender_type in ('buyer', 'provider', 'admin', 'system')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_messages_message_not_blank' and conrelid = 'public.service_request_messages'::regclass
  ) then
    alter table public.service_request_messages add constraint service_request_messages_message_not_blank check (
      length(trim(message)) > 0
    );
  end if;
end $$;

-- 8) Job artifacts (before/after photos, invoice attachment, signature proof, etc).
create table if not exists public.service_request_artifacts (
  id text primary key,
  request_id text not null references public.buyer_service_requests(id) on delete cascade,
  uploaded_by_type text not null,
  uploaded_by_id text,
  artifact_type text not null,
  storage_path text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists service_request_artifacts_request_id_idx on public.service_request_artifacts (request_id, created_at desc);
create index if not exists service_request_artifacts_metadata_gin_idx on public.service_request_artifacts using gin (metadata);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_artifacts_uploaded_by_type_valid' and conrelid = 'public.service_request_artifacts'::regclass
  ) then
    alter table public.service_request_artifacts add constraint service_request_artifacts_uploaded_by_type_valid check (
      uploaded_by_type in ('buyer', 'provider', 'admin', 'system')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_artifacts_type_valid' and conrelid = 'public.service_request_artifacts'::regclass
  ) then
    alter table public.service_request_artifacts add constraint service_request_artifacts_type_valid check (
      artifact_type in ('before_photo', 'after_photo', 'invoice', 'receipt', 'signature', 'other')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_request_artifacts_storage_path_not_blank' and conrelid = 'public.service_request_artifacts'::regclass
  ) then
    alter table public.service_request_artifacts add constraint service_request_artifacts_storage_path_not_blank check (
      length(trim(storage_path)) > 0
    );
  end if;
end $$;

-- 9) Transition guard for request status + automatic event recording.
create or replace function public.is_valid_service_status_transition(old_status text, new_status text)
returns boolean
language sql
immutable
as $$
  select case
    when old_status = new_status then true
    when old_status = 'pending' and new_status in ('matched', 'in_progress', 'completed') then true
    when old_status = 'matched' and new_status in ('in_progress', 'completed') then true
    when old_status = 'in_progress' and new_status in ('completed') then true
    else false
  end
$$;

create or replace function public.on_buyer_service_request_status_change()
returns trigger
language plpgsql
as $$
declare
  event_id text;
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if not public.is_valid_service_status_transition(old.status, new.status) then
      raise exception 'Invalid service status transition: % -> %', old.status, new.status;
    end if;

    if new.status = 'matched' and new.accepted_at is null then
      new.accepted_at = now();
    end if;
    if new.status = 'in_progress' and new.started_at is null then
      new.started_at = now();
    end if;
    if new.status = 'completed' and new.completed_at is null then
      new.completed_at = now();
    end if;

    event_id := concat('evt-', extract(epoch from now())::bigint, '-', substring(md5(random()::text) from 1 for 8));
    insert into public.service_request_events (
      id, request_id, actor_type, actor_id, event_type, event_note, payload
    ) values (
      event_id,
      new.id,
      'system',
      null,
      'status_changed',
      concat('Status changed from ', old.status, ' to ', new.status),
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists buyer_service_request_status_change on public.buyer_service_requests;
create trigger buyer_service_request_status_change
  before update on public.buyer_service_requests
  for each row
  execute procedure public.on_buyer_service_request_status_change();

-- 10) RLS enablement + baseline public-select policies (write policies should be tightened in app auth rollout).
alter table public.service_request_assignments enable row level security;
alter table public.service_request_events enable row level security;
alter table public.service_request_quotes enable row level security;
alter table public.service_payments enable row level security;
alter table public.service_provider_payouts enable row level security;
alter table public.service_request_messages enable row level security;
alter table public.service_request_artifacts enable row level security;

drop policy if exists "service_request_assignments_select_public" on public.service_request_assignments;
create policy "service_request_assignments_select_public"
  on public.service_request_assignments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "service_request_events_select_public" on public.service_request_events;
create policy "service_request_events_select_public"
  on public.service_request_events
  for select
  to anon, authenticated
  using (true);

drop policy if exists "service_request_quotes_select_public" on public.service_request_quotes;
create policy "service_request_quotes_select_public"
  on public.service_request_quotes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "service_payments_select_public" on public.service_payments;
create policy "service_payments_select_public"
  on public.service_payments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "service_provider_payouts_select_public" on public.service_provider_payouts;
create policy "service_provider_payouts_select_public"
  on public.service_provider_payouts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "service_request_messages_select_public" on public.service_request_messages;
create policy "service_request_messages_select_public"
  on public.service_request_messages
  for select
  to anon, authenticated
  using (true);

drop policy if exists "service_request_artifacts_select_public" on public.service_request_artifacts;
create policy "service_request_artifacts_select_public"
  on public.service_request_artifacts
  for select
  to anon, authenticated
  using (true);

comment on table public.service_request_assignments is 'Assignment history for service requests, including accepts/declines.';
comment on table public.service_request_events is 'Immutable timeline of service request lifecycle events.';
comment on table public.service_request_quotes is 'Provider quote/estimate lifecycle for service requests.';
comment on table public.service_payments is 'Payment transactions linked to service requests.';
comment on table public.service_provider_payouts is 'Provider payout records derived from captured service payments.';
comment on table public.service_request_messages is 'Operational messaging thread for each service request.';
comment on table public.service_request_artifacts is 'Uploaded evidence/docs for service jobs (photos, receipts, signatures).';
