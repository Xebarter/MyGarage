-- Snapshot buyer contact on service requests so providers see phone without extra joins.

alter table public.buyer_service_requests
  add column if not exists buyer_contact_phone text not null default '',
  add column if not exists buyer_contact_name text not null default '';

comment on column public.buyer_service_requests.buyer_contact_phone is 'Buyer phone at request time (from customers); shown to providers during dispatch.';
comment on column public.buyer_service_requests.buyer_contact_name is 'Buyer display name at request time; shown to providers during dispatch.';
