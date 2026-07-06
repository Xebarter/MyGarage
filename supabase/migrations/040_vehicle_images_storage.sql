-- Vehicle photos uploaded via /api/uploads/vehicle-image (Next.js API + service role).
-- Requires public.buyer_vehicles (migration 036_buyer_vehicles_garage.sql).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-images',
  'vehicle-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vehicle_images_public_read" on storage.objects;
create policy "vehicle_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'vehicle-images');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'buyer_vehicles'
      and column_name = 'image_url'
  ) then
    comment on column public.buyer_vehicles.image_url is
      'Public URL for the vehicle photo (Supabase vehicle-images bucket or external URL).';
  end if;
end $$;
