-- Vehicle documents (PDF + images) uploaded via /api/uploads/vehicle-document.
-- Requires public.buyer_vehicle_documents (migration 037_buyer_profile_control_center.sql).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-documents',
  'vehicle-documents',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vehicle_documents_public_read" on storage.objects;
create policy "vehicle_documents_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'vehicle-documents');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'buyer_vehicle_documents'
      and column_name = 'file_url'
  ) then
    comment on column public.buyer_vehicle_documents.file_url is
      'Public URL for the document file (Supabase vehicle-documents bucket or external URL).';
  end if;
end $$;
