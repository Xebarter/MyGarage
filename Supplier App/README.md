# MyGarage Supplier — Vendor App

Flutter app for **product suppliers**. Service providers use `Services Mobile App/`; buyers use `Mobile App/`.

This app mirrors the web **Vendor portal** (`/vendor`).

## Features

- Email/password + Google sign-in (Supabase)
- Verification gate until `vendorVerified`
- Dashboard analytics (revenue, orders, top products)
- Product listings CRUD with images, variants, publish, featured request
- Order fulfillment (processing → shipped → delivered)
- Promotions and ad applications
- Funds summary + payout preferences
- Profile edit + avatar + sign out

## Setup

```bat
cd "Supplier App"
setup.bat
```

Edit `.env`:

```env
API_URL=http://10.0.2.2:3000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

| Environment | `API_URL` |
|-------------|-----------|
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |
| Chrome / Flutter web | `http://localhost:3000` |
| Physical device | `http://YOUR_LAN_IP:3000` |
| Production | `https://www.mygarage.ug` (use **www**) |

## Google OAuth

Add these to **Supabase → Authentication → URL Configuration → Redirect URLs**:

- `https://www.mygarage.ug/auth/supplier-mobile-callback`
- `ug.mygarage.supplier://login-callback`

## Run

This project ships Android, iOS, and web. On a Windows PC with no phone or emulator attached, run in Chrome.

If CanvasKit/fonts fail to load from Google’s CDN (blank page, `Failed to fetch canvaskit.js`, or `Cannot find context with specified id`), serve the engine locally:

```bat
flutter run -d chrome --no-web-resources-cdn
```

Otherwise:

```bat
flutter run -d chrome
```

On an Android emulator or device:

```bat
flutter run
```

Sign in with a vendor account. Admin must set `vendor_verified` on the `vendors` row before the dashboard unlocks.
