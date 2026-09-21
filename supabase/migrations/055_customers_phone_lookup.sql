-- Faster buyer profile lookup when phone is the primary sign-in identity.
create index if not exists customers_phone_idx on public.customers (phone);
