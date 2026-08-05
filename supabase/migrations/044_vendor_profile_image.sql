-- Provider profile images (Services Mobile App + buyer tracking).
-- Column for public URL; uploads via /api/uploads/vendor-avatar (service role).

alter table public.vendors
  add column if not exists image_url text;

comment on column public.vendors.image_url is
  'Public URL for the provider/vendor profile photo (Supabase vendor-avatars bucket or external URL).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-avatars',
  'vendor-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vendor_avatars_public_read" on storage.objects;
create policy "vendor_avatars_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'vendor-avatars');
