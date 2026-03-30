-- Coordinates for buyer destination and live provider position during fulfillment.

alter table public.buyer_service_requests
  add column if not exists destination_lat double precision,
  add column if not exists destination_lng double precision,
  add column if not exists provider_lat double precision,
  add column if not exists provider_lng double precision,
  add column if not exists provider_location_updated_at timestamptz;

comment on column public.buyer_service_requests.destination_lat is 'Buyer service location latitude (optional; may be geocoded from location text).';
comment on column public.buyer_service_requests.destination_lng is 'Buyer service location longitude.';
comment on column public.buyer_service_requests.provider_lat is 'Last reported provider latitude while en route.';
comment on column public.buyer_service_requests.provider_lng is 'Last reported provider longitude while en route.';
comment on column public.buyer_service_requests.provider_location_updated_at is 'When provider position was last updated.';
