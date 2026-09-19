-- Concierge identity fields on garage vehicles, plus buyer notes on service requests.

alter table public.buyer_vehicles
  add column if not exists trim text,
  add column if not exists engine text,
  add column if not exists drive_type text,
  add column if not exists body_type text,
  add column if not exists tyre_size text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_vehicles_drive_type_valid' and conrelid = 'public.buyer_vehicles'::regclass
  ) then
    alter table public.buyer_vehicles add constraint buyer_vehicles_drive_type_valid check (
      drive_type is null or drive_type in ('fwd', 'rwd', 'awd', '4wd')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_vehicles_body_type_valid' and conrelid = 'public.buyer_vehicles'::regclass
  ) then
    alter table public.buyer_vehicles add constraint buyer_vehicles_body_type_valid check (
      body_type is null or body_type in ('sedan', 'hatch', 'suv', 'pickup', 'van', 'other')
    );
  end if;
end $$;

alter table public.buyer_service_requests
  add column if not exists notes text not null default '';

comment on column public.buyer_vehicles.trim is 'Factory trim / variant, e.g. TXL or XLi.';
comment on column public.buyer_vehicles.engine is 'Engine description, e.g. 1.8L 2ZR-FE.';
comment on column public.buyer_vehicles.drive_type is 'fwd, rwd, awd, or 4wd.';
comment on column public.buyer_vehicles.body_type is 'sedan, hatch, suv, pickup, van, or other.';
comment on column public.buyer_vehicles.tyre_size is 'Tyre size as fitted, e.g. 205/55R16.';
comment on column public.buyer_service_requests.notes is 'Buyer symptom / request notes captured at booking.';
