# Supabase setup (MyGarage)

## Environment

Ensure `.env` includes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by API routes for product CRUD)

### Google sign-in (Supabase OAuth)

1. Create a **Google Cloud** OAuth Web client with redirect URI  
   `https://<project-ref>.supabase.co/auth/v1/callback`
2. Enable **Google** in Supabase → **Authentication** → **Providers** and paste Client ID + secret.
3. Add `http://localhost:3000/**` and `https://mygarage.ug/**` under Supabase → **URL Configuration** → **Redirect URLs**.

**Step-by-step:** [docs/google-sign-in-setup.md](docs/google-sign-in-setup.md)

Optional Firebase env vars (`NEXT_PUBLIC_FIREBASE_*`) are for Analytics only, not required for Google login.

## Database

1. Open the Supabase dashboard → **SQL Editor**.
2. Run the script in `supabase/migrations/001_products.sql` (creates `products`, optional RLS policy, and seed rows).

If you skip the SQL file, the app will still try to auto-seed the same six products **after** the table exists (first empty `products` table).

## Code map

| Area | Location |
|------|-----------|
| Browser Supabase client | `lib/supabase/client.ts` |
| Server (cookies) client | `lib/supabase/server.ts` |
| Service role (admin) client | `lib/supabase/admin.ts` |
| Product persistence | `lib/supabase/products-repo.ts` → used by `lib/db.ts` |

## Security note

The service role bypasses RLS. For production, prefer authenticated users + tightened RLS, and reserve the service role for trusted server jobs only.

## Admin role assignment

Admin access for `/admin` is **sign-in only**. Users cannot self-signup as admin.

After a user signs up normally, run this in Supabase SQL Editor to grant admin:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

To remove admin role:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
where email = 'admin@example.com';
```
