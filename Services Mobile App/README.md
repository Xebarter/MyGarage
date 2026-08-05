# MyGarage Services — Provider App

Flutter mobile app for **MyGarage service providers** only. Buyers use the Expo app in `Mobile App/`; product vendors use the web `/vendor` portal.

## Features (v1)

- Email/password + Google sign-in (Supabase)
- Verification gate until `servicesVerified`
- Live job offers with **loud looping alarm + vibration** and a full-screen intercept over other apps
- Active trip: map, stage advances (arrived → started → completed), live location
- Garage completion notes on job complete
- My Services listings CRUD
- Funds summary + payout preferences
- Profile edit + sign out

## Prerequisites

1. [Flutter SDK](https://docs.flutter.dev/get-started/install) on your PATH (`flutter doctor`)
2. Running MyGarage Next.js API (local or `https://mygarage.ug`)
3. Same Supabase project credentials as the web app

## Setup

```bat
cd "Services Mobile App"
setup.bat
```

Or manually:

```bat
cd "Services Mobile App"
copy .env.example .env
flutter create . --project-name mygarage_services --org ug.mygarage --platforms=android,ios
flutter pub get
```

Edit `.env`:

```env
API_URL=http://10.0.2.2:3000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key
GOOGLE_MAPS_API_KEY=your-maps-key
```

| Environment | `API_URL` |
|-------------|-----------|
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |
| Physical device | `http://YOUR_LAN_IP:3000` |
| Production | `https://www.mygarage.ug` (use **www** — apex redirects break POST accept/decline) |

### Google Maps (Android)

Add to `android/local.properties` (created by Flutter):

```properties
GOOGLE_MAPS_API_KEY=your-maps-key
```

Enable **Maps SDK for Android** (and iOS) on the key.

## Run

```bat
flutter run
```

Or in Chrome:

```bat
flutter run -d chrome
```

Sign in with Google or email. Use a provider account that has (or will get) `services_verified` in Supabase `vendors`.

### Job offer alerts

When an offer is assigned, the app:

1. Plays a **looping loud alarm** (Android alarm audio stream) and a strong vibration pattern
2. Shows a **full-screen Accept / Decline** intercept
3. On Android, also posts a **full-screen intent notification** so it can appear over the lock screen and other apps while the process is still running

Allow **Notifications** when prompted. For best results, enable **Display over other apps** for MyGarage Services in system settings (requested once by the app).

### Google sign-in (phone / APK)

1. Supabase → **Authentication** → **URL Configuration** → **Redirect URLs**, ensure:
   ```
   https://mygarage.ug/**
   ug.mygarage.services://login-callback
   ```
2. Set `API_URL=https://mygarage.ug` in `.env` (OAuth redirect uses `{API_URL}/auth/services-mobile-callback`).
3. Rebuild the APK after this deep-link change (`flutter build apk --release`).
4. After Google, the browser briefly opens MyGarage, then returns to the app.

## Backend note

`POST /api/vendor/bootstrap` accepts either:

- Browser session cookies (web portal), or
- `Authorization: Bearer <supabase_access_token>` (this app)

## Project layout

```
lib/
  api/           REST clients
  models/        DTOs
  providers/     Auth + dispatch state
  screens/       UI
  router/        go_router
  theme/         dark provider shell
```

## Out of scope (v1)

Dashboard analytics, Customers, Promotions, push notifications.

## Git / secrets

- Copy `.env.example` → `.env` locally (never commit `.env`).
- `android/local.properties` is machine-local (SDK paths); do not commit it.
- Release builds currently use the debug keystore — replace before Play Store upload.
