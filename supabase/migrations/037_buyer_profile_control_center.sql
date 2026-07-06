-- Buyer profile control center: notifications, preferences, vehicle documents, service recommendations.

alter table public.customers
  add column if not exists preferred_contact_method text not null default 'email',
  add column if not exists account_status text not null default 'active',
  add column if not exists deactivated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'customers_preferred_contact_method_valid' and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers add constraint customers_preferred_contact_method_valid check (
      preferred_contact_method in ('email', 'phone', 'both')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'customers_account_status_valid' and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers add constraint customers_account_status_valid check (
      account_status in ('active', 'deactivated')
    );
  end if;
end $$;

create table if not exists public.buyer_notification_preferences (
  customer_id text primary key references public.customers(id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  service_updates boolean not null default true,
  maintenance_reminders boolean not null default true,
  marketing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buyer_notifications (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  notification_type text not null default 'system',
  title text not null default '',
  body text not null default '',
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists buyer_notifications_customer_id_idx
  on public.buyer_notifications (customer_id, created_at desc);
create index if not exists buyer_notifications_unread_idx
  on public.buyer_notifications (customer_id)
  where read_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_notifications_type_valid' and conrelid = 'public.buyer_notifications'::regclass
  ) then
    alter table public.buyer_notifications add constraint buyer_notifications_type_valid check (
      notification_type in ('system', 'service_update', 'maintenance_reminder', 'document_expiry', 'payment', 'recommendation', 'message')
    );
  end if;
end $$;

create table if not exists public.buyer_preferences (
  customer_id text primary key references public.customers(id) on delete cascade,
  preferred_provider_ids text[] not null default '{}',
  service_mode text not null default 'both',
  language text not null default 'en',
  region text not null default 'UG',
  distance_unit text not null default 'km',
  currency text not null default 'UGX',
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_preferences_service_mode_valid' and conrelid = 'public.buyer_preferences'::regclass
  ) then
    alter table public.buyer_preferences add constraint buyer_preferences_service_mode_valid check (
      service_mode in ('mobile', 'workshop', 'both')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_preferences_distance_unit_valid' and conrelid = 'public.buyer_preferences'::regclass
  ) then
    alter table public.buyer_preferences add constraint buyer_preferences_distance_unit_valid check (
      distance_unit in ('km', 'miles')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_preferences_theme_valid' and conrelid = 'public.buyer_preferences'::regclass
  ) then
    alter table public.buyer_preferences add constraint buyer_preferences_theme_valid check (
      theme in ('system', 'light', 'dark')
    );
  end if;
end $$;

create table if not exists public.buyer_vehicle_documents (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  vehicle_id text not null references public.buyer_vehicles(id) on delete cascade,
  document_type text not null default 'other',
  name text not null default '',
  file_url text,
  storage_path text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_vehicle_documents_vehicle_id_idx
  on public.buyer_vehicle_documents (vehicle_id, created_at desc);
create index if not exists buyer_vehicle_documents_customer_id_idx
  on public.buyer_vehicle_documents (customer_id);
create index if not exists buyer_vehicle_documents_expiry_idx
  on public.buyer_vehicle_documents (expires_at)
  where expires_at is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_vehicle_documents_type_valid' and conrelid = 'public.buyer_vehicle_documents'::regclass
  ) then
    alter table public.buyer_vehicle_documents add constraint buyer_vehicle_documents_type_valid check (
      document_type in ('logbook', 'insurance', 'inspection', 'registration', 'warranty', 'other')
    );
  end if;
end $$;

create table if not exists public.service_provider_recommendations (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  vehicle_id text references public.buyer_vehicles(id) on delete set null,
  provider_id text references public.vendors(id) on delete set null,
  request_id text references public.buyer_service_requests(id) on delete set null,
  title text not null default '',
  description text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_provider_recommendations_customer_id_idx
  on public.service_provider_recommendations (customer_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_provider_recommendations_status_valid' and conrelid = 'public.service_provider_recommendations'::regclass
  ) then
    alter table public.service_provider_recommendations add constraint service_provider_recommendations_status_valid check (
      status in ('pending', 'approved', 'rejected')
    );
  end if;
end $$;

create or replace function public.buyer_notification_preferences_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists buyer_notification_preferences_set_updated_at on public.buyer_notification_preferences;
create trigger buyer_notification_preferences_set_updated_at
  before update on public.buyer_notification_preferences
  for each row execute procedure public.buyer_notification_preferences_set_updated_at();

create or replace function public.buyer_preferences_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists buyer_preferences_set_updated_at on public.buyer_preferences;
create trigger buyer_preferences_set_updated_at
  before update on public.buyer_preferences
  for each row execute procedure public.buyer_preferences_set_updated_at();

create or replace function public.buyer_vehicle_documents_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists buyer_vehicle_documents_set_updated_at on public.buyer_vehicle_documents;
create trigger buyer_vehicle_documents_set_updated_at
  before update on public.buyer_vehicle_documents
  for each row execute procedure public.buyer_vehicle_documents_set_updated_at();

create or replace function public.service_provider_recommendations_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists service_provider_recommendations_set_updated_at on public.service_provider_recommendations;
create trigger service_provider_recommendations_set_updated_at
  before update on public.service_provider_recommendations
  for each row execute procedure public.service_provider_recommendations_set_updated_at();

comment on table public.buyer_notifications is 'In-app buyer notifications for service, maintenance, and system events.';
comment on table public.buyer_vehicle_documents is 'Per-vehicle documents with optional expiry tracking.';
