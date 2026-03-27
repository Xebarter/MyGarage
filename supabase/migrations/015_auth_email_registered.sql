-- Server-side lookup: whether auth.users already has this email (case-insensitive).
-- Exposed only to service_role for use from trusted API routes (never anon).

create or replace function public.auth_email_registered(check_email text)
returns boolean
language sql
security definer
set search_path = auth
stable
as $$
  select exists (
    select 1
    from auth.users u
    where u.email is not null
      and lower(trim(u.email)) = lower(trim(check_email))
  );
$$;

revoke all on function public.auth_email_registered(text) from public;
grant execute on function public.auth_email_registered(text) to service_role;
