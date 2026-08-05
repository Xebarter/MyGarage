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

### My Garage (buyer vehicles)

Run these in order in the **SQL Editor** (or via `supabase db push` if you use the CLI):

| Migration | Purpose |
|-----------|---------|
| `036_buyer_vehicles_garage.sql` | `buyer_vehicles` table, service history, `vehicle_id` on service requests |
| `037_buyer_profile_control_center.sql` | Profile notifications, preferences, vehicle documents |
| `038_buyer_subscriptions.sql` | Subscription tiers |
| `039_subscription_checkout_line_items.sql` | Subscription checkout line items |
| `040_vehicle_images_storage.sql` | `vehicle-images` storage bucket for uploaded vehicle photos |
| `041_vehicle_documents_storage.sql` | `vehicle-documents` storage bucket for PDFs and document images |
| `042_vendor_service_listings.sql` | Provider service list prices + public min/max ranges |

**Important:** If `/services/myservices` fails with “Could not find the table `public.vendor_service_listings`”, open **SQL Editor** and run `supabase/migrations/042_vendor_service_listings.sql`.  

Until that migration is applied, the app still stores listings in the provider’s auth `app_metadata` so My Services keeps working.

Vehicle photos are stored in Supabase Storage (`vehicle-images` bucket); the public URL is saved in `buyer_vehicles.image_url`. Uploads go through `/api/uploads/vehicle-image` using the service role (no client-side storage policy needed for writes).

Vehicle documents (insurance, logbook, etc.) are stored in the `vehicle-documents` bucket; the public URL is saved in `buyer_vehicle_documents.file_url`. Uploads go through `/api/uploads/vehicle-document` (JPEG, PNG, WebP, GIF, or PDF, up to 10 MB).

Listing/product images use migration `017_listing_images_storage.sql` (`listing-images` bucket).

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
-- 1) Confirm the account exists and inspect current metadata
select id, email, raw_app_meta_data, last_sign_in_at
from auth.users
where lower(email) = lower('your@email.com');

-- 2) Grant admin (run only after step 1 returns a row)
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin","roles":["admin"]}'::jsonb
where lower(email) = lower('your@email.com');

-- 3) Verify
select id, email, raw_app_meta_data->>'role' as role, raw_app_meta_data->'roles' as roles
from auth.users
where lower(email) = lower('your@email.com');
```

Then **sign out**, open `/auth?role=admin&next=/admin`, and sign in again.

**Env allowlist (fastest for local/dev):** add to `.env` and restart the dev server:

```env
ADMIN_EMAILS=sebenock027@gmail.com
```

Comma-separate multiple admins. This works even before SQL metadata is applied.

**Dashboard alternative:** Authentication → Users → select the user → **App metadata** → `{"role":"admin","roles":["admin"]}` → Save.

To remove admin role:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
where email = 'admin@example.com';
```
