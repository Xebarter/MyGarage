-- Device tokens so providers can receive job offers while the app is closed.

create table if not exists public.vendor_push_tokens (
  id text primary key,
  vendor_id text not null references public.vendors(id) on delete cascade,
  token text not null,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_push_tokens_token_not_blank check (length(trim(token)) > 8),
  constraint vendor_push_tokens_platform_valid check (platform in ('android', 'ios', 'web'))
);

create unique index if not exists vendor_push_tokens_token_uidx
  on public.vendor_push_tokens (token);

create index if not exists vendor_push_tokens_vendor_id_idx
  on public.vendor_push_tokens (vendor_id);

create or replace function public.vendor_push_tokens_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vendor_push_tokens_set_updated_at on public.vendor_push_tokens;
create trigger vendor_push_tokens_set_updated_at
  before update on public.vendor_push_tokens
  for each row
  execute procedure public.vendor_push_tokens_set_updated_at();

alter table public.vendor_push_tokens enable row level security;
