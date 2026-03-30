-- Broadcast row changes on buyer_service_requests so clients can subscribe (map + status without polling).

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'buyer_service_requests'
  ) then
    alter publication supabase_realtime add table public.buyer_service_requests;
  end if;
end $$;
