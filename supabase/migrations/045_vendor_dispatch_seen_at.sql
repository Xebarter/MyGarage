-- Heartbeat so sequential dispatch can prefer providers who currently have the Services app open.

alter table public.vendors
  add column if not exists dispatch_seen_at timestamptz;

comment on column public.vendors.dispatch_seen_at is 'Last time this provider polled dispatch/me from the Services app.';

create index if not exists vendors_dispatch_seen_at_idx
  on public.vendors (dispatch_seen_at desc);
