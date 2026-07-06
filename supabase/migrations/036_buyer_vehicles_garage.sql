-- My Garage: buyer vehicles, service history timeline, and vehicle linkage on service requests.

create table if not exists public.buyer_vehicles (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  make text not null default '',
  model text not null default '',
  year integer not null default extract(year from now())::integer,
  license_plate text,
  image_url text,
  nickname text,
  is_primary boolean not null default false,
  vehicle_status text not null default 'no_active_issues',
  next_service_date timestamptz,
  status_updated_by_provider_id text references public.vendors(id) on delete set null,
  status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_vehicles_customer_id_idx on public.buyer_vehicles (customer_id);
create index if not exists buyer_vehicles_primary_idx on public.buyer_vehicles (customer_id, is_primary);
create index if not exists buyer_vehicles_status_idx on public.buyer_vehicles (vehicle_status);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_vehicles_make_not_blank' and conrelid = 'public.buyer_vehicles'::regclass
  ) then
    alter table public.buyer_vehicles add constraint buyer_vehicles_make_not_blank check (length(trim(make)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_vehicles_model_not_blank' and conrelid = 'public.buyer_vehicles'::regclass
  ) then
    alter table public.buyer_vehicles add constraint buyer_vehicles_model_not_blank check (length(trim(model)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_vehicles_year_valid' and conrelid = 'public.buyer_vehicles'::regclass
  ) then
    alter table public.buyer_vehicles add constraint buyer_vehicles_year_valid check (year >= 1900 and year <= 2100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_vehicles_status_valid' and conrelid = 'public.buyer_vehicles'::regclass
  ) then
    alter table public.buyer_vehicles add constraint buyer_vehicles_status_valid check (
      vehicle_status in ('in_service', 'awaiting_parts', 'ready_for_pickup', 'no_active_issues')
    );
  end if;
end $$;

create unique index if not exists buyer_vehicles_one_primary_per_customer_key
  on public.buyer_vehicles (customer_id)
  where is_primary = true;

create or replace function public.buyer_vehicles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyer_vehicles_set_updated_at on public.buyer_vehicles;
create trigger buyer_vehicles_set_updated_at
  before update on public.buyer_vehicles
  for each row
  execute procedure public.buyer_vehicles_set_updated_at();

alter table public.buyer_vehicles enable row level security;

drop policy if exists "buyer_vehicles_select_public" on public.buyer_vehicles;
create policy "buyer_vehicles_select_public"
  on public.buyer_vehicles
  for select
  to anon, authenticated
  using (true);

create table if not exists public.vehicle_service_history (
  id text primary key,
  vehicle_id text not null references public.buyer_vehicles(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  service_request_id text references public.buyer_service_requests(id) on delete set null,
  service_type text not null default 'other',
  service_name text not null default '',
  service_date timestamptz not null default now(),
  provider_id text references public.vendors(id) on delete set null,
  provider_name text not null default '',
  notes text not null default '',
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicle_service_history_vehicle_id_idx on public.vehicle_service_history (vehicle_id, service_date desc);
create index if not exists vehicle_service_history_customer_id_idx on public.vehicle_service_history (customer_id);
create index if not exists vehicle_service_history_provider_id_idx on public.vehicle_service_history (provider_id);
create index if not exists vehicle_service_history_service_type_idx on public.vehicle_service_history (service_type);
create index if not exists vehicle_service_history_status_idx on public.vehicle_service_history (status);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vehicle_service_history_service_type_valid' and conrelid = 'public.vehicle_service_history'::regclass
  ) then
    alter table public.vehicle_service_history add constraint vehicle_service_history_service_type_valid check (
      service_type in ('repair', 'maintenance', 'diagnostic', 'inspection', 'other')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vehicle_service_history_status_valid' and conrelid = 'public.vehicle_service_history'::regclass
  ) then
    alter table public.vehicle_service_history add constraint vehicle_service_history_status_valid check (
      status in ('scheduled', 'in_progress', 'completed', 'cancelled')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vehicle_service_history_service_name_not_blank' and conrelid = 'public.vehicle_service_history'::regclass
  ) then
    alter table public.vehicle_service_history add constraint vehicle_service_history_service_name_not_blank check (length(trim(service_name)) > 0);
  end if;
end $$;

create or replace function public.vehicle_service_history_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicle_service_history_set_updated_at on public.vehicle_service_history;
create trigger vehicle_service_history_set_updated_at
  before update on public.vehicle_service_history
  for each row
  execute procedure public.vehicle_service_history_set_updated_at();

alter table public.vehicle_service_history enable row level security;

drop policy if exists "vehicle_service_history_select_public" on public.vehicle_service_history;
create policy "vehicle_service_history_select_public"
  on public.vehicle_service_history
  for select
  to anon, authenticated
  using (true);

alter table public.buyer_service_requests
  add column if not exists vehicle_id text references public.buyer_vehicles(id) on delete set null;

create index if not exists buyer_service_requests_vehicle_id_idx on public.buyer_service_requests (vehicle_id);

comment on table public.buyer_vehicles is 'Customer-owned vehicles for My Garage.';
comment on table public.vehicle_service_history is 'Per-vehicle service timeline entries from MyGarage interactions.';
comment on column public.buyer_vehicles.vehicle_status is 'Updated exclusively by the last service provider.';
comment on column public.buyer_vehicles.next_service_date is 'Next recommended service date; set by service providers only.';
