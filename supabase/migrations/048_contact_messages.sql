-- Public /contact-us form submissions, managed in the admin dashboard.

create table if not exists public.contact_messages (
  id text primary key,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  message text not null default '',
  status text not null default 'new',
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_messages_status_idx on public.contact_messages (status);
create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages (email);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contact_messages_name_not_blank' and conrelid = 'public.contact_messages'::regclass
  ) then
    alter table public.contact_messages add constraint contact_messages_name_not_blank check (length(trim(name)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contact_messages_email_not_blank' and conrelid = 'public.contact_messages'::regclass
  ) then
    alter table public.contact_messages add constraint contact_messages_email_not_blank check (length(trim(email)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contact_messages_message_not_blank' and conrelid = 'public.contact_messages'::regclass
  ) then
    alter table public.contact_messages add constraint contact_messages_message_not_blank check (length(trim(message)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contact_messages_status_valid' and conrelid = 'public.contact_messages'::regclass
  ) then
    alter table public.contact_messages add constraint contact_messages_status_valid check (
      status in ('new', 'read', 'in_progress', 'resolved', 'archived')
    );
  end if;
end $$;

create or replace function public.contact_messages_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contact_messages_set_updated_at on public.contact_messages;
create trigger contact_messages_set_updated_at
  before update on public.contact_messages
  for each row
  execute procedure public.contact_messages_set_updated_at();

alter table public.contact_messages enable row level security;

comment on table public.contact_messages is 'Public contact-us form submissions for admin follow-up.';
