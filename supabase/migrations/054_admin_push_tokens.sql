-- FCM tokens for admins signed into the web portal (alerts + sound on device).

create table if not exists public.admin_push_tokens (
  id text primary key,
  user_id text not null,
  token text not null,
  platform text not null default 'web',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_push_tokens_token_not_blank check (length(trim(token)) > 8),
  constraint admin_push_tokens_platform_valid check (platform in ('android', 'ios', 'web'))
);

create unique index if not exists admin_push_tokens_token_uidx
  on public.admin_push_tokens (token);

create index if not exists admin_push_tokens_user_id_idx
  on public.admin_push_tokens (user_id);

create or replace function public.admin_push_tokens_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.last_seen_at = now();
  return new;
end;
$$;

drop trigger if exists admin_push_tokens_set_updated_at on public.admin_push_tokens;
create trigger admin_push_tokens_set_updated_at
  before update on public.admin_push_tokens
  for each row
  execute procedure public.admin_push_tokens_set_updated_at();

alter table public.admin_push_tokens enable row level security;
