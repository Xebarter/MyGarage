-- Portal-aware "should we block the auto sign-up path after a failed password sign-in?"
-- Any email may continue across buyer / vendor / service-provider portals (same Supabase login).
-- We only block when the email already has the *same* app profile for that portal:
--   buyer portal  -> already a customer
--   vendor portal -> already a vendor
-- Service-provider portal never blocks here (no separate profile table); sign-in / sign-up handles the rest.
-- Unknown portals (e.g. admin): strict auth check.

create or replace function public.auth_portal_signup_blocked(check_email text, portal text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  e text := lower(trim(check_email));
  p text := lower(trim(portal));
begin
  if p = 'buyer' then
    return exists (
      select 1 from public.customers c where lower(trim(c.email)) = e
    );
  end if;

  if p = 'vendor' then
    return exists (
      select 1 from public.vendors v where lower(trim(v.email)) = e
    );
  end if;

  if p = 'services' then
    return false;
  end if;

  return exists (
    select 1 from auth.users u where u.email is not null and lower(trim(u.email)) = e
  );
end;
$$;

revoke all on function public.auth_portal_signup_blocked(text, text) from public;
grant execute on function public.auth_portal_signup_blocked(text, text) to service_role;
