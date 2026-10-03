-- Current Android APK for each audience (public, supplier, service provider).
-- Files live in the private mobile-apps bucket. Downloads use short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mobile-apps',
  'mobile-apps',
  false,
  78643200,
  array[
    'application/vnd.android.package-archive',
    'application/octet-stream',
    'application/zip',
    'application/java-archive'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.mobile_app_releases (
  audience text primary key,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  version_label text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mobile_app_releases_audience_valid'
      and conrelid = 'public.mobile_app_releases'::regclass
  ) then
    alter table public.mobile_app_releases
      add constraint mobile_app_releases_audience_valid
      check (audience in ('public', 'vendor', 'services'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mobile_app_releases_file_name_not_blank'
      and conrelid = 'public.mobile_app_releases'::regclass
  ) then
    alter table public.mobile_app_releases
      add constraint mobile_app_releases_file_name_not_blank
      check (length(trim(file_name)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mobile_app_releases_storage_path_not_blank'
      and conrelid = 'public.mobile_app_releases'::regclass
  ) then
    alter table public.mobile_app_releases
      add constraint mobile_app_releases_storage_path_not_blank
      check (length(trim(storage_path)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mobile_app_releases_file_size_positive'
      and conrelid = 'public.mobile_app_releases'::regclass
  ) then
    alter table public.mobile_app_releases
      add constraint mobile_app_releases_file_size_positive
      check (file_size > 0);
  end if;
end $$;

create or replace function public.mobile_app_releases_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mobile_app_releases_set_updated_at on public.mobile_app_releases;
create trigger mobile_app_releases_set_updated_at
  before update on public.mobile_app_releases
  for each row
  execute procedure public.mobile_app_releases_set_updated_at();

alter table public.mobile_app_releases enable row level security;

comment on table public.mobile_app_releases is
  'One current Android APK per audience. Served only through signed URLs after an audience check.';
