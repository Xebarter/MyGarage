-- Richer My Garage vehicle records and provider service-log entries.

alter table public.buyer_vehicles
  add column if not exists vin text,
  add column if not exists color text,
  add column if not exists mileage_km integer,
  add column if not exists fuel_type text,
  add column if not exists transmission text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_vehicles_fuel_type_valid' and conrelid = 'public.buyer_vehicles'::regclass
  ) then
    alter table public.buyer_vehicles add constraint buyer_vehicles_fuel_type_valid check (
      fuel_type is null or fuel_type in ('petrol', 'diesel', 'hybrid', 'electric', 'other')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_vehicles_transmission_valid' and conrelid = 'public.buyer_vehicles'::regclass
  ) then
    alter table public.buyer_vehicles add constraint buyer_vehicles_transmission_valid check (
      transmission is null or transmission in ('manual', 'automatic', 'other')
    );
  end if;
end $$;

alter table public.vehicle_service_history
  add column if not exists findings text not null default '',
  add column if not exists recommendations text not null default '',
  add column if not exists parts_used text not null default '',
  add column if not exists odometer_km integer,
  add column if not exists photo_urls jsonb not null default '[]'::jsonb,
  add column if not exists labor_hours numeric(6, 2);

comment on column public.vehicle_service_history.notes is 'Primary buyer-visible write-up of work done.';
comment on column public.vehicle_service_history.findings is 'What was inspected or found wrong.';
comment on column public.vehicle_service_history.recommendations is 'Follow-up advice for the buyer.';
comment on column public.vehicle_service_history.parts_used is 'Parts replaced or fitted.';
comment on column public.vehicle_service_history.photo_urls is 'Public URLs of job photos.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-service-photos',
  'vehicle-service-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vehicle_service_photos_public_read" on storage.objects;
create policy "vehicle_service_photos_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'vehicle-service-photos');
