-- One current file per audience and platform (Android APK or iOS IPA).

alter table public.mobile_app_releases
  add column if not exists platform text;

update public.mobile_app_releases
set platform = 'android'
where platform is null or btrim(platform) = '';

alter table public.mobile_app_releases
  alter column platform set default 'android';

alter table public.mobile_app_releases
  alter column platform set not null;

alter table public.mobile_app_releases
  drop constraint if exists mobile_app_releases_pkey;

alter table public.mobile_app_releases
  add constraint mobile_app_releases_pkey primary key (audience, platform);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mobile_app_releases_platform_valid'
      and conrelid = 'public.mobile_app_releases'::regclass
  ) then
    alter table public.mobile_app_releases
      add constraint mobile_app_releases_platform_valid
      check (platform in ('android', 'ios'));
  end if;
end $$;

update storage.buckets
set allowed_mime_types = array[
  'application/vnd.android.package-archive',
  'application/octet-stream',
  'application/zip',
  'application/java-archive',
  'application/x-itunes-ipa'
]::text[]
where id = 'mobile-apps';

comment on table public.mobile_app_releases is
  'One current Android APK or iOS IPA per audience. Served only through signed URLs after an audience check.';
